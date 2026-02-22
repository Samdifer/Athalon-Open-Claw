# WS15-A — PDF Export / Self-Contained Records

**Workstream:** WS15-A  
**Feature:** PDF Export / Self-Contained Maintenance Records  
**Phase:** 15 — R&D + SME-Driven Feature Development  
**Owners:** Devraj Anand (backend), Jonas Harker (infra/delivery), Marcus Webb (compliance review)  
**SME:** Carla Ostrowski (DOM, Columbus OH)  
**Date Opened:** 2026-02-22  
**Status:** READY FOR BUILD  

---

## SME Brief

### Carla Ostrowski — Director of Maintenance, Central States Aviation Services, Columbus OH

Carla has been a DOM for 16 years and holds an IA. She has survived three FSDO unannounced ramp inspections and one formal investigation triggered in part by a records gap in a prior vendor system. She did not come to our demo looking for features — she came to test a hypothesis: that Athelon was another system that looks good until an inspector walks in.

Her framing of the requirement, stated verbatim in our first meeting, is the operating brief for this entire workstream:

> "My test is simple. I create a work order. I complete it. I generate the maintenance release. I export it to PDF. Then I look at it the way an FAA inspector would — no database, no app, no account. Does that document stand on its own? Can I hand it to someone and say 'this is complete on its face'? Two vendors failed that test in under four minutes. One of them never understood why."

Her minimum bar is not "a PDF exists." It is: **an inspector can pick up the printed document and, without accessing any software, verify who performed the work, under what authority, on which aircraft, with which certificate numbers, on which specific date, with what approved data reference, and whether any correction was made.**

**Failure modes and edge cases Carla surfaced:**

1. **Certificate number absent or aliased.** If the export says "jsmith" instead of "A&P 3847261," the document fails. She checks the cert number first. Always.

2. **Timestamp reflects session start, not signature action.** She once received a vendor-generated maintenance record where the timestamp was the time the user logged in, not the time they completed the signature. That is not a timestamp — it is a login log. The export must reflect the atomic signature moment.

3. **Hash visible only inside the app.** "If the tamper evidence requires me to run software to verify it, it doesn't exist for the inspector. Print the hash. All 64 characters. Monospaced. On the face of the document."

4. **Silent truncation of work performed narrative.** If the "work performed" field has a character limit and the system fills a long entry but clips it in the export, the legally material text is missing and no one knows. She is aware of at least one vendor (Corridor predecessor) that did this in production for 17 closed work orders before anyone noticed.

5. **Correction chain hidden.** If a record was corrected and the correction logic lives only in the database, the paper output shows an uncontested record that is factually different from what happened. The original entry and the correction must both appear.

6. **QCM review state ambiguous.** If QCM reviewed the record, that review with reviewer identity, timestamp, and findings must be on the document. If QCM had not reviewed at time of export, the document must say so explicitly — not be silent.

7. **Color-dependent legibility.** She prints to a black-and-white copier for the shop's file copy. Any export where legibility depends on color encoding fails her physical workflow.

8. **Section ordering non-intuitive for inspectors.** "An inspector reads top to bottom. They want to know who, what authority, which aircraft, what work, who signed, when. If your document puts the hash before the certificate number, you've prioritized software engineers over inspectors. That's not who you're building for."

**Carla's minimum bar, explicit:**
- Tail number on every page.
- Certificate number (A&P and IA where applicable) on the signature block, not just in an appendix.
- Full work performed text — no truncation, no ellipsis.
- Approved data reference at document/revision/section level.
- All installed/removed parts with P/N, S/N, and 8130-3 reference.
- Discrepancies listed with disposition status and corrective action text.
- RTS statement with IA cert number, not IA name alone.
- SHA-256 hash in full, on the face of the document.
- Correction chain visible even when correction is "none."
- Export timestamp and exporter identity in the footer.
- Page X of Y pagination.

> "Screens turn off. Servers go down. Vendors go out of business. The paper copy is the record. If your software can't produce a paper copy that survives those events, you haven't built a compliance tool — you've built a very expensive way to create paper that might not exist when you need it."

---

## R&D Scope

### What Needs to Be Designed/Researched Before Build

**Already designed (Phase 6 alpha work):** The `exportMaintenanceRecord` action spec, the ordered 9-field payload structure, the print route architecture, and Carla's acceptance test criteria are documented in `phase-6-alpha/pdf-export.md`. That document is the direct input to this workstream. **Do not re-design from scratch.** This is a build workstream with a completed design.

**Open technical questions requiring resolution before build starts:**

1. **PDF rendering approach — final selection.** Phase 6 recommended Option (c): structured JSON from Convex action + client print route (`@media print`) for alpha. Phase 15 must decide whether to continue with Option (c) or graduate to Option (a) (server-side Puppeteer rendering in a Convex action or external render service) for the production v1.1 feature. The decision criteria:
   - Option (c) is browser-dependent. The document format is controlled by the browser's print engine. Different browsers produce different outputs. For a legally admissible record, variability is a risk.
   - Option (a) produces a byte-for-byte consistent artifact regardless of client. The SHA-256 hash of the PDF itself can be stored alongside the hash of the record content, creating a chain-of-custody from record → export artifact.
   - **Recommended: Option (a) for v1.1.** Jonas to spike Convex action + external render service (Gotenberg, or AWS Lambda with headless Chrome) — evaluate cold start times, cost, and artifact storage model. Spike budget: 3 days.

2. **PDF artifact storage and retrieval.** If we generate a PDF on the server, where does it live? Options:
   - Generate on demand and return base64 (no storage, regenerated on each request).
   - Generate, store in Convex file storage, return a signed URL (stored artifact, audit-linked).
   - **Preferred: store the artifact** — the `record_exported` audit event can then include a reference to the specific file, enabling chain-of-custody verification that the export at time T was version V of the data.

3. **Export idempotency and versioning.** What happens when a record is exported, then the record is corrected, then exported again? The second export must reflect the correction chain. The first export PDF, if stored, must be identifiably superseded. Schema design required: `pdfExports` table with `recordId`, `generatedAt`, `generatedBy`, `exportHash`, `fileId`, `supersededBy` (nullable).

4. **Tail number on every page.** The `@page` CSS specification and Puppeteer's header/footer injection both support running page headers. The tail number and WO number must appear in the running header of every page, not just page 1.

5. **Character limit enforcement and visible counters.** Per Finding 3 from the requirements synthesis: all free-text fields must have defined limits, visible counters, and pre-limit warnings. The PDF export spec depends on these limits being correct in the data layer — if a field accepts 10,000 characters and the export template truncates at 2,000, that is a compliance failure. Devraj to audit all free-text field limits and confirm export template renders full text up to the defined limit.

6. **Long-record pagination stability.** A work order with 40 task card steps, 12 discrepancies, and 8 installed parts will produce a multi-page document. The pagination rules (break-inside: avoid for signature blocks; "(continued)" labels for multi-page sections) must be tested against a synthetic maximum-length record before release, not just average-length records.

**Regulatory touch points:**
- §43.9(a)(1) — Description of work performed (must be complete, not summarized)
- §43.9(a)(2) — Approved data used
- §43.9(a)(3) — Date of work completion
- §43.9(a)(4) — Certificate number of the person performing the work
- AC 43-9C Section 6 — Content requirements for maintenance record entries
- AC 120-78B §5 — Electronic signature audit trail requirements (the export must capture the complete audit trail, not just the final signed state)

---

## Implementation Spec

### Data Model Changes

**New table: `pdfExports`**

```typescript
pdfExports: defineTable({
  recordId:         v.id("maintenanceRecords"),
  workOrderId:      v.id("workOrders"),
  orgId:            v.id("organizations"),
  generatedAt:      v.number(),        // epoch ms
  generatedBy:      v.id("users"),
  exportVersion:    v.string(),        // semver, e.g. "1.0.0"
  format:           v.union(v.literal("pdf"), v.literal("json"), v.literal("both")),
  fileId:           v.optional(v.id("_storage")),  // Convex file storage ref
  exportHash:       v.string(),        // SHA-256 of the ordered payload JSON, for chain-of-custody
  supersededBy:     v.optional(v.id("pdfExports")),  // set when record is corrected and re-exported
  auditEventId:     v.id("auditLog"),  // mandatory — export always writes audit entry
})
.index("by_record", ["recordId"])
.index("by_workOrder", ["workOrderId"])
.index("by_org_generatedAt", ["orgId", "generatedAt"])
```

**No schema changes to `maintenanceRecords` or `auditLog` — existing fields sufficient.**

**`auditLog` event type addition:**  
Add `"record_exported"` to the `eventType` enum in the auditLog table.  
Fields: `{ recordId, workOrderId, exportFormat, exportVersion, exportHash, fileId (if stored), exportedBy }`.

### Mutations / Actions / Queries

**Action: `convex/exports/exportMaintenanceRecord.ts`**

```typescript
export const exportMaintenanceRecord = action({
  args: {
    recordId:    v.id("maintenanceRecords"),
    format:      v.optional(v.union(v.literal("pdf"), v.literal("json"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    // 1. Auth: requireOrgMembership(ctx, "viewer") — any org member may export
    // 2. Load record, verify org match
    // 3. Call internal query: getMaintenanceRecordFullExportPayload({ recordId })
    //    — this assembles the ordered 9-field payload (see Phase 6 spec)
    // 4. Serialize payload to canonical JSON (field order enforced, no lossy transform)
    // 5. Compute exportHash: SHA-256 of canonical JSON string
    // 6. If format includes "pdf": invoke render service (Gotenberg/Lambda)
    //    — store resulting PDF in Convex file storage
    //    — retrieve fileId
    // 7. Write pdfExports record with all metadata
    // 8. Write auditLog record_exported event (MANDATORY — fail closed if audit write fails)
    // 9. Return: { exportVersion, generatedAt, recordId, exportFormat,
    //              ordered43_9Export, exportHash, fileUrl (signed), auditEventId }
  }
});
```

**Fail-closed contract:** If the `auditLog` write fails, the entire action throws. No export is returned without a corresponding audit record. This is a hard invariant — not a best-effort.

**Internal query: `convex/exports/getMaintenanceRecordFullExportPayload.ts`** (internal only, not callable from client directly)

Assembles the strict ordered payload:
1. `repairStationIdentity` — from `organizations` table: legalName, part145CertificateNumber, address
2. `aircraftIdentity` — from `aircraft` table: registration (N-number normalized), make, model, serialNumber, totalTimeAtWOOpen
3. `workOrderIdentity` — from `workOrders`: workOrderNumber, type, openedAt, closedAt, customerName, aogDeclaredAt
4. `taskExecutionSummary` — from `taskCards` + `taskCardSteps`: array of { stepNumber, description, status, completedAt, signerLegalName, signerCertNumber, signerIaCertNumber (if applicable), stepHash }
5. `maintenanceRecordEntry` — from `maintenanceRecords`: recordType, workPerformed (FULL TEXT — no truncation), approvedDataReference (structured object, full), partsReplaced (array with P/N, S/N, 8130CertRef, quantity), completionDate, correctionChain
6. `discrepancyDispositionSummary` — from `discrepancies`: array of { discrepancyNumber, description, disposition, correctiveAction (FULL TEXT), closedBy, closedAt }
7. `returnToServiceSummary` — from `returnToServiceEvents`: rtsStatementFull, iaName, iaCertNumber, rtsTimestamp, rtsHash
8. `adComplianceSummary` — from `adCompliance`: array of applicable ADs with compliance date, method, next due
9. `fullAuditTrail` — from `auditLog`: all events for this recordId + workOrderId, with actor identity (legal name + cert number where applicable) and timestamps

**Validation before payload assembly:**
- Every signer must have `certNumber` — throw `CERT_NUMBER_MISSING` if absent
- IA signers must have `iaCertNumber` — throw `IA_CERT_NUMBER_MISSING` if absent
- `workPerformed` text must be retrieved without truncation — use full document read, validate byte length against stored field length
- Correction chain: always populated (empty array is valid, but explicit)

**Query: `convex/exports/listExportsForRecord.ts`** (for UI export history panel)

Returns array of `pdfExports` for a given `recordId`, ordered by `generatedAt` desc, with `supersededBy` chain resolved.

### UI Components

**Component: `ExportRecordButton`**  
Location: Work order detail header (WO detail page) + maintenance record detail action bar.  
Label: `Export Record (PDF/Print)`  
Behavior:
- Triggers `exportMaintenanceRecord` action
- Shows loading state: "Generating export..."
- On success: opens signed PDF URL in new tab + shows toast "Export complete — record_exported event logged"
- On failure: shows error with specific code (MR_NOT_FOUND, EXPORT_RENDER_FAILED, etc.) — never silent failure

**Component: `ExportHistoryPanel`**  
Location: Maintenance record detail sidebar  
Shows: list of prior exports with `generatedAt`, `generatedBy`, `exportVersion`, `exportHash` (truncated for display, full in tooltip), and whether the export has been superseded.  
Purpose: provides chain-of-custody visibility for QCM and DOM audits.

**Print Route: `/work-orders/[id]/records/[recordId]/print`**  
- No app shell — standalone print page
- Renders ordered 9-section layout per Phase 6 PDF spec
- `@page { size: letter; margin: 0.5in; }`
- Running header: "{N-NUMBER} | WO {WONUMBER} | Page X of Y"
- Footer: "Exported {timestamp} by {exporterName} | Export v{version} | Hash: {exportHash truncated for footer, full in appendix}"
- Grayscale-safe throughout — no color-dependent semantics
- Section titles: 12.5pt bold; body: 10.5pt; hash: 8pt monospaced
- Signature block: boxed, `break-inside: avoid`
- Correction chain block: always present; if empty, prints "No corrections recorded."
- QCM block: always present; if not reviewed, prints "QCM review not recorded at time of export."

### Validation Rules

| Rule | Enforcement Point | Error If Violated |
|---|---|---|
| `certNumber` present on all signers in export | payload assembly | `CERT_NUMBER_MISSING` |
| `iaCertNumber` present on all IA signers | payload assembly | `IA_CERT_NUMBER_MISSING` |
| `workPerformed` not truncated (full text) | payload assembly | `FIELD_TRUNCATION_DETECTED` |
| `record_exported` audit event written atomically with export | action handler | Action throws, no export returned |
| PDF render service returns within 15s | render call | `EXPORT_RENDER_TIMEOUT` — user shown specific error |
| Export only for records in same org as caller | auth guard | `MR_ORG_MISMATCH` |
| Supersession chain set when record corrected and re-exported | export write | `pdfExports.supersededBy` set automatically |

---

## Test Plan — Authored by Cilla Oduya

> *"PDF export is the feature a DOM uses when something has gone wrong and someone official is asking questions. I am not going to let us ship a feature that fails under those conditions. Every test case below was designed by imagining the worst possible moment someone might need this document."*

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| PDF-01 | Happy path: export a fully closed, IA-signed work order | WO with 3 task cards, 2 discrepancies (both closed), 4 parts installed, IA RTS signed, QCM reviewed | PDF generated; all 9 sections present in order; IA cert number visible on signature block; SHA-256 hash full 64 characters on face of document; `record_exported` audit event in log; no truncation of workPerformed (test with 3,000-char narrative) | §43.9, AC 43-9C, AC 120-78B |
| PDF-02 | Export without IA re-authentication cert number stored | Org provisioned without `iaCertNumber` on IA user; IA sign-off completed in legacy flow that didn't enforce IA number | Action throws `IA_CERT_NUMBER_MISSING`; no PDF generated; user sees actionable error message directing them to update IA profile before export | §43.9(a)(4), AC 120-78B §4.a.2 |
| PDF-03 | Export with correction chain present | Record created; later corrected via correction mutation (field: workPerformed, reason: "typo in approved data reference"); both export | Original workPerformed text visible; correction reason visible; corrector identity + cert number visible; corrector timestamp visible; no overwrite — both entries on paper | AC 120-78B §5.d (alteration control), AC 43-9C §6.c |
| PDF-04 | QCM has not reviewed at time of export | Work order closed, IA RTS signed, but QCM review event absent from audit log | Export succeeds; QCM block renders: "QCM review not recorded at time of export."; no silent omission; this condition is explicitly visible to inspector | AC 120-78B §5, Part 145 §145.211 |
| PDF-05 | Export an open (in-progress) work order | WO with 2 of 5 task cards complete, no RTS | Export succeeds with partial completeness; RTS block shows "Return to Service: NOT AUTHORIZED AT TIME OF EXPORT"; all 9 sections present; unsigned steps shown as "PENDING"; `record_exported` audit event written | AC 43-9C §6 (partial records must be legible) |
| PDF-06 | Simultaneous exports by two users (concurrency) | User A and User B both trigger export on same record within 500ms | Two separate `pdfExports` records created; two `record_exported` audit events; no corruption of either artifact; hashes are independent and both valid | AC 120-78B audit trail completeness |
| PDF-07 | Export after record re-export following correction | Record exported (v1), correction applied, re-exported (v2) | v1 export record has `supersededBy` = v2 export ID; ExportHistoryPanel shows both with clear "superseded" label on v1; inspector can retrieve both artifacts | Chain-of-custody; AC 120-78B |
| PDF-08 | Long work order — pagination stress | WO with 40 task cards, 15 discrepancies, 12 parts, a 5,000-char workPerformed narrative | Document paginated correctly; signature block does not split across pages; N-number appears in running header on every page; workPerformed renders in full (no ellipsis, no "...more"); "(continued)" labels on multi-page sections | §43.9(a)(1), AC 43-9C §6.a |
| PDF-09 | Render service timeout | Configure render service mock to return after 20s (exceeds 15s limit) | Action returns `EXPORT_RENDER_TIMEOUT`; no `pdfExports` record created; no `record_exported` audit event (timeout is a non-event); user sees specific error: "PDF generation timed out — please try again"; no partial artifact stored | Fail-safe behavior; no corrupted artifacts in storage |
| PDF-10 | Audit write failure (database error during export) | Inject DB failure on `auditLog` insert during export action | Action throws; no PDF returned to client; no `pdfExports` record created; fail-closed invariant verified; user sees "Export failed — please contact support" | AC 120-78B §5 (every export must be audited); fail-closed design |
| PDF-11 | Grayscale print fidelity | Export a record with all content types; print to grayscale printer (or convert PDF to grayscale) | All text readable; no information loss due to color removal; verification status ("IDENTICAL" / "MISMATCH") conveyed by text, not color alone; hash readable | Practical audit survivability requirement from Carla |
| PDF-12 | Cross-org export attempt | User in Org A attempts to export a record belonging to Org B | Action throws `MR_ORG_MISMATCH`; no PDF generated; no audit event for the cross-org attempt; HTTP 403 at API level | Data isolation requirement |

---

## Compliance Sign-Off Checklist — Marcus Webb

> *"This is not a feature checklist. This is the minimum evidence I need before I will call this feature compliant. Each item has a specific regulation or advisory circular behind it. The ones marked [HARD BLOCKER] are not negotiable — if they are not satisfied, the feature does not release. Period."*

### Applicable Regulations and Advisory Circulars

- **14 CFR §43.9** — Maintenance records: content requirements
- **14 CFR §43.9(a)(1)** — Description of work performed
- **14 CFR §43.9(a)(2)** — Approved data used
- **14 CFR §43.9(a)(3)** — Date of work completion
- **14 CFR §43.9(a)(4)** — Name of person performing the work, their signature, and certificate number
- **AC 43-9C** — Maintenance records; Section 6: minimum content requirements for maintenance entries
- **AC 120-78B** — Electronic Signatures in Aviation; §4 signature requirements, §5 audit trail requirements, §5.d alteration control

### Sign-Off Items

| Item | Description | FAR/AC Basis | Hard Blocker |
|---|---|---|---|
| MWC-A-01 | Export displays complete certificate number (A&P number) for every signing technician — not username, not employee ID, not name alone | §43.9(a)(4) | **YES** |
| MWC-A-02 | Export displays IA certificate number separately from A&P certificate number for any IA-signed entry — both numbers present and correctly labeled | §43.9(a)(4), AC 120-78B §4.a.2 | **YES** |
| MWC-A-03 | `workPerformed` field renders in full on the export — character limit of the field is documented; export never truncates to fit layout | §43.9(a)(1) | **YES** |
| MWC-A-04 | Approved data reference field shows complete structured reference (document type, document ID, revision, chapter/section/subject) — not freeform summary | §43.9(a)(2), AC 43-9C §6.b | **YES** |
| MWC-A-05 | Signature timestamp reflects the moment the atomic signatureAuthEvent was consumed — not session start, not page load, not client clock | §43.9(a)(3), AC 120-78B §5.a | **YES** |
| MWC-A-06 | SHA-256 hash of the record appears in full (64 hexadecimal characters) on the face of the printed document — not only in app UI, not only in appendix reference | AC 120-78B §5 (audit trail integrity) | **YES** |
| MWC-A-07 | Correction chain fully visible when a correction has been made — original value, corrected value, corrector identity, corrector cert number, correction timestamp, reason for correction | AC 120-78B §5.d | **YES** |
| MWC-A-08 | QCM review state is explicitly stated — either reviewed (with reviewer identity, timestamp, findings) or explicitly "not recorded at time of export" — never silent absence | AC 120-78B §5, Part 145 §145.211 | **YES** |
| MWC-A-09 | `record_exported` audit event is written atomically with every export, before any PDF artifact is returned to the caller — fail-closed design verified by test PDF-10 | AC 120-78B §5 (chain of custody) | **YES** |
| MWC-A-10 | RTS section of export includes full RTS certification statement text (not a summary), IA certificate number, and timestamp — not IA name alone | §43.9, AC 120-78B §4.a.2 | **YES** |
| MWC-A-11 | Export passes Carla Ostrowski's acceptance test (PDF-01 through PDF-08) in the presence of a QA witness before feature is marked release-eligible | Operational validation requirement | **YES** |
| MWC-A-12 | Export for open (in-progress) work orders correctly marks unsigned steps as PENDING and RTS section as NOT AUTHORIZED — no ambiguity about record completeness | AC 43-9C §6 | YES |
| MWC-A-13 | N-number appears in the running page header of every page of a multi-page document | AC 43-9C §6 (identifiability) | YES |
| MWC-A-14 | All installed parts with P/N, S/N, and traceability document reference (8130-3 cert reference) appear in the export — no parts omitted | §43.9(a)(1), Part 145 §145.109 | YES |
| MWC-A-15 | AD compliance summary section lists all applicable ADs for the aircraft, with compliance date and method — not only ADs addressed in this work order | §91.409, Part 145 §145.219 | YES |
| MWC-A-16 | Export version number embedded in document footer — enables identification of which export template version produced this document | Operational auditability | No |
| MWC-A-17 | CI regression test suite includes an export test against a synthetic maximum-length record (40 task cards, 15 discrepancies, 12 parts, 5,000-char narrative) and fails build if any field truncation detected | Regression prevention | YES |

**Marcus's final note on this workstream:**

> "The Phase 6 design spec for this feature was solid. The gap was execution — the feature wasn't built. We are now building it for real, and I want to be in the room for the Carla acceptance test. Not to second-guess the engineers — to document that it happened, who was present, what record was used, and that the output passed. That documentation becomes part of the regulatory dossier we maintain. If an FAA inspector ever asks 'how do you know your PDF exports are compliant,' I want to hand them a signed acceptance test record with a DOM's name on it."

---

## Dependency Notes

- Depends on: Phase 14 PASS (clean) — **satisfied**
- Depends on: `authorizeReturnToService` 9-precondition enforcement — **built (Phase 4)**
- Depends on: SHA-256 cryptographic hash on all signed records — **built (Phase 12)**
- Depends on: `getMaintenanceRecordAuditTrail` query — **built (Phase 6)**
- Depends on: `signatureAuthEvent` atomic consumption — **built (Phase 4)**
- Depends on: Render service selection (Gotenberg vs Lambda) — **Jonas spike required (3 days)**
- Depends on: `pdfExports` table migration — **Devraj: 1 day**

---

## Status

**READY FOR BUILD**

Phase 6 design is complete and validated. Phase 15 adds: server-side PDF rendering (Jonas spike), artifact storage with chain-of-custody (`pdfExports` table), and the full test suite through Cilla. The Phase 6 print route approach is acceptable as a parallel track while Jonas completes the render service spike, so that Cilla can begin test plan execution against the print route while the server-side render is in progress.

**Sprint allocation:** 2 weeks  
**Owner for delivery:** Devraj Anand (action + payload assembly) + Jonas Harker (render service integration) + Chloe Park (ExportRecordButton + print route)  
**Marcus sign-off checkpoint:** After PDF-01 through PDF-11 pass; before release tag.
