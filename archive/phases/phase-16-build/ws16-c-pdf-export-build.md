# WS16-C — PDF Export Build + §43.9 CI Regression

**Workstream:** WS16-C  
**Phase:** 16 — Build Execution  
**Owners:** Devraj Anand (backend/action) + Jonas Harker (render service) + Marcus Webb (compliance review)  
**Source R&D:** `phase-15-rd/ws15-a-pdf-export.md`  
**Output:** `phase-16-build/ws16-c-pdf-export-build.md`  
**Date:** 2026-02-22  
**Status:** BUILD READY — EXECUTE NOW

---

## 1. Library Choice and Rationale

### Decision: Convex Action + Gotenberg (server-side render) + `@react-pdf/renderer` for template authoring

**Rejected: browser-side `@media print` / `window.print()`**  
Phase 6 used a browser-based print route as an alpha proof of concept. For v1.1 production, this is explicitly rejected:

- Browser engines (Chrome, Safari, Firefox) produce non-identical PDF byte sequences from identical HTML. The SHA-256 of the PDF artifact differs across browsers for the same record.
- Running headers (`N-NUMBER | WO | Page X of Y`) are controlled by browser print settings, which the user can override or disable.
- No server-side artifact is stored; chain-of-custody requires the export artifact itself to exist as a durable object.
- Cannot audit which exact document was handed to an inspector.

**Selected: Convex action → Gotenberg**

- Gotenberg is a stateless Docker microservice wrapping headless Chromium. It accepts HTML + CSS and returns a byte-deterministic PDF. The same HTML produces the same PDF bytes on the same Gotenberg version — enabling SHA-256 of the PDF artifact itself (not just record JSON) to be stored.
- Gotenberg is containerizable on Fly.io or Railway alongside the Convex deployment; cold-start is under 500ms for a warm container (Jonas spike: use container with `keep-alive` polling from Convex action scheduler to avoid cold starts).
- The Convex action assembles the ordered 9-field payload JSON, serializes it to HTML using a deterministic server-side template (not `@react-pdf/renderer` — see below), sends it to Gotenberg, receives PDF bytes, stores in Convex file storage, writes the `pdfExports` record with the artifact hash, and returns a signed file URL.

**`@react-pdf/renderer` — Rejected for server-side rendering**  
`@react-pdf/renderer` generates PDFs via a PDF-specific virtual DOM. It does not render HTML. The font metrics differ from Gotenberg's Chromium renderer. Choosing a single renderer for both the print preview (HTML in the browser) and the stored artifact (server-side) means maintaining two template codebases. Gotenberg renders the same HTML/CSS that the print preview uses, eliminating template divergence.

**Template authoring: HTML/CSS template literal (TypeScript)**  
A single TypeScript file (`convex/exports/templates/maintenance-record-template.ts`) exports a pure function `renderMaintenanceRecordHTML(payload: MaintenanceRecordExportPayload): string`. This is the single source of truth for the document format. The print route (for preview) and Gotenberg (for artifact) both consume this function's output.

**Summary rationale table:**

| Criterion | Browser Print | @react-pdf | Convex + Gotenberg |
|---|---|---|---|
| Byte-deterministic PDF | ❌ | ✅ (different renderer) | ✅ (same engine as preview) |
| Artifact stored for chain-of-custody | ❌ | ✅ | ✅ |
| Single template for preview + artifact | N/A | ❌ | ✅ |
| Running headers on every page | ❌ (user-controlled) | ✅ | ✅ |
| SHA-256 of PDF artifact storable | ❌ | ✅ | ✅ |
| Inspector receives same document every time | ❌ | ✅ | ✅ |

---

## 2. §43.9-Compliant PDF Template Specification

### 2.1 Document Layout: 9-Section Ordered Structure

Page size: US Letter (8.5" × 11")  
Margins: 0.5" all sides  
Body font: 10.5pt Georgia or Times New Roman (serif, print-legible)  
Section titles: 12.5pt bold, same serif  
Hash block: 8.5pt monospaced (Courier New or Courier)  
Color use: NONE for semantic information. All statuses and states conveyed in text. Color may be used for section rule lines only (black, grayscale-safe by definition).

**Running page header (every page, including page 2+):**
```
[N-NUMBER] | WO [WONUMBER] | [REPAIR STATION NAME] | Cert 145-[NUMBER]   Page X of Y
```
8pt, rule line below, printed on every page by Gotenberg `headerHtml` injection.

**Footer (every page):**
```
Exported [ISO-8601 UTC timestamp] by [Exporter Legal Name] | Template v[EXPORT_VERSION] | SHA-256 (record): [first 16 chars]...
Full hash in Section 9. This document is the maintenance record.
```

---

### Section 1: Repair Station Identity

**Fields (all required — hard block if absent):**

| Field | Source | Label on Document |
|---|---|---|
| Legal name | `organizations.legalName` | Repair Station Name |
| Part 145 Certificate Number | `organizations.part145CertificateNumber` | FAA Repair Station Certificate No. |
| Station Address (street, city, state, ZIP) | `organizations.address` | Authorized Location of Work |
| Ratings held | `organizations.ratings[]` | Airframe / Powerplant / Avionics / etc. |

**Layout:** 2-column box at top of Section 1. Left column: label. Right column: value. Black border.

---

### Section 2: Aircraft Identity

**Fields (all required):**

| Field | Source | Label on Document |
|---|---|---|
| Registration (N-Number) | `aircraft.registration` (normalized to N-XXXXX) | Aircraft Registration |
| Make | `aircraft.make` | Make |
| Model | `aircraft.model` | Model |
| Serial Number | `aircraft.serialNumber` | Aircraft Serial Number |
| Total Time at WO Open (hours) | `workOrders.aircraftTotalTimeAtOpen` | Aircraft Total Time at Induction (Hours) |
| Total Time at WO Close (hours) | `workOrders.aircraftTotalTimeAtClose` | Aircraft Total Time at Release (Hours) |

**Regulatory note:** Total time at close is required by AC 43-9C §6 to confirm the maintenance event is anchored to a specific point in the aircraft's life.

---

### Section 3: Work Order Identity

**Fields:**

| Field | Source | Label on Document |
|---|---|---|
| Work Order Number | `workOrders.workOrderNumber` | Work Order Number |
| Work Order Type | `workOrders.type` | Type of Work |
| Date Opened | `workOrders.openedAt` (UTC ISO date) | Induction Date |
| Date Closed | `workOrders.closedAt` (UTC ISO date) | Completion Date |
| Customer Name | `workOrders.customerName` | Aircraft Owner / Operator |
| AOG Declared | `workOrders.aogDeclaredAt` | AOG Status |

If `aogDeclaredAt` is non-null, prints: "AOG declared [ISO date]. Expedited processing authorized."

---

### Section 4: Work Performed

**Regulatory basis:** §43.9(a)(1) — "Description of the work performed."

**CRITICAL REQUIREMENT:** This field renders in FULL. No truncation. No ellipsis. No "...see attached." The HTML template MUST use `word-wrap: break-word; white-space: pre-wrap; overflow: visible;` on the work-performed container. Gotenberg will paginate naturally. If the field is 10,000 characters, all 10,000 characters print.

**Fields:**

| Field | Source | Label on Document |
|---|---|---|
| Work Performed (full text) | `maintenanceRecords.workPerformed` | Description of Work Performed |
| Approved Data Reference — Document Type | `maintenanceRecords.approvedDataReference.documentType` | Approved Data: Document Type |
| Approved Data Reference — Document Number | `maintenanceRecords.approvedDataReference.documentNumber` | Approved Data: Document / Publication No. |
| Approved Data Reference — Revision | `maintenanceRecords.approvedDataReference.revisionNumber` | Approved Data: Revision |
| Approved Data Reference — Chapter/Section | `maintenanceRecords.approvedDataReference.chapterSectionSubject` | Approved Data: Chapter / Section / Subject |
| Applicability Notes | `maintenanceRecords.approvedDataReference.applicabilityNotes` | Approved Data: Applicability Notes |

**Layout:** Work Performed renders first in a full-width block. Approved data reference renders below as a 2-column grid.

**Validation at payload assembly:** If `workPerformed` length in the payload does not equal the stored field length byte-for-byte (validated by comparing `Buffer.byteLength` of the fetched string against the database's stored byte length), action throws `FIELD_TRUNCATION_DETECTED` before any PDF is rendered.

---

### Section 5: Task Card Execution Summary

**Regulatory basis:** §43.9(a)(3) & (4) — date of work, name, signature, certificate number.

**One row per task card step.** Columns:

| Column | Source |
|---|---|
| Step # | `taskCardSteps.stepNumber` |
| Task Card Title | `taskCards.title` |
| Step Description | `taskCardSteps.description` |
| Status | `taskCardSteps.status` (COMPLETE / PENDING / WAIVED) |
| Completed Date (UTC) | `taskCardSteps.completedAt` |
| Signer Legal Name | `users.legalName` (resolved from `taskCardSteps.signedBy`) |
| A&P Certificate No. | `users.certNumber` — **rendered verbatim, not aliased** |
| IA Certificate No. | `users.iaCertNumber` (if applicable — shown as "N/A" if not IA sign-off) |
| Step Hash (SHA-256) | `taskCardSteps.stepHash` — first 16 chars + "(full hash in Section 9 audit trail)" |

**Pending steps:** Render with status = "PENDING — not completed at time of export."

**Table break behavior:** `page-break-inside: avoid` on each row containing a signature block. Multi-row task cards with long descriptions: `(continued)` label on each continuation page.

---

### Section 6: Discrepancies and Dispositions

**All discrepancies present in the work order — none omitted.**

Columns per row:

| Column | Source |
|---|---|
| Discrepancy No. | `discrepancies.discrepancyNumber` |
| Description | `discrepancies.description` (FULL TEXT) |
| Disposition | `discrepancies.disposition` (CORRECTED / DEFERRED / BEYOND SCOPE / CUSTOMER DECLINED) |
| Corrective Action | `discrepancies.correctiveAction` (FULL TEXT — no truncation) |
| Closed By (Legal Name + A&P Cert No.) | `users.legalName` + `users.certNumber` |
| Closed Date (UTC) | `discrepancies.closedAt` |

**Open discrepancies:** If disposition is absent (not yet dispositioned), renders: "OPEN — no disposition recorded at time of export."

---

### Section 7: Parts Installed / Removed

**All parts — none omitted.**

Sub-table A — Installed Parts:

| Column | Source |
|---|---|
| Part Number | `partsReplaced[n].partNumber` |
| Serial Number | `partsReplaced[n].serialNumber` |
| Description | `partsReplaced[n].description` |
| Quantity | `partsReplaced[n].quantity` |
| 8130-3 Certificate Reference | `partsReplaced[n].form8130.certNumber` |
| 8130-3 Release Date | `partsReplaced[n].form8130.releaseDate` |
| Approval Basis | `partsReplaced[n].form8130.approvalBasis` |

Sub-table B — Parts Removed (if any):

Same structure; clearly labeled "Parts Removed from Aircraft."

If no parts were installed or removed: "No parts installed or removed during this work order."

---

### Section 8: Return to Service

**Regulatory basis:** §43.9, §43.11, AC 120-78B §4.a.2

**Maintenance Release Statement (full regulatory language — not a summary):**

```
MAINTENANCE RELEASE — RETURN TO SERVICE CERTIFICATION

I certify that the work specified in this maintenance record has been performed in accordance
with the requirements of 14 CFR Part 43 and the aircraft is approved for return to service.

Pursuant to 14 CFR §43.9 and §43.11, I certify that:
  (1) The work described herein was completed on the date indicated;
  (2) The approved data used is identified in Section 4 of this record;
  (3) The aircraft has been inspected in accordance with the applicable regulations;
  (4) The aircraft is airworthy in accordance with current approved design data.
```

**IA-specific additional certification (printed when IA-signed RTS):**

```
This Return to Service for [major repair / annual inspection / 100-hour inspection — specify] was
authorized pursuant to 14 CFR §43.11(a)(2) by an FAA-certificated Airframe and Powerplant Mechanic
with Inspection Authorization.
```

**Fields:**

| Field | Source | Label |
|---|---|---|
| IA Legal Name | `returnToServiceEvents.iaName` | Authorized Inspector — Full Legal Name |
| IA A&P Certificate No. | `returnToServiceEvents.iaCertNumber` (A&P portion) | A&P Certificate No. |
| IA Inspection Authorization No. | `returnToServiceEvents.iaInspectionAuthNumber` | Inspection Authorization No. |
| RTS Timestamp (UTC) | `returnToServiceEvents.rtsTimestamp` | Date and Time of Return to Service Certification |
| RTS Hash (SHA-256) | `returnToServiceEvents.rtsHash` | Record Integrity Hash (RTS event) |

**If no RTS has been issued at time of export:**

```
RETURN TO SERVICE: NOT AUTHORIZED AT TIME OF EXPORT

This document reflects the current state of the maintenance record as of [export timestamp].
No Return to Service certification has been issued for this work order. This aircraft may not be
returned to service until RTS certification is complete.
```

---

### Section 9: Audit Trail and Record Integrity

**Sub-section A: Full Audit Trail**

Chronological table of all `auditLog` events for this record and work order:

| Timestamp (UTC) | Event Type | Actor Legal Name | Actor Cert No. | Summary |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

**Sub-section B: QCM Review State**

If QCM review event present:
```
Quality Control Manager Review:
  Reviewer: [name], [cert/title]
  Review Timestamp: [UTC ISO]
  Findings: [findings text or "No findings — record accepted"]
```

If QCM review absent:
```
QCM REVIEW NOT RECORDED AT TIME OF EXPORT.
This field is explicitly blank — not omitted. If this export is used as a final maintenance record,
QCM review should be completed and the record re-exported before filing.
```

**Sub-section C: Correction Chain**

If corrections exist:
```
RECORD CORRECTION HISTORY:
[1] Field: [field name]
    Original Value: [verbatim original text]
    Corrected Value: [verbatim corrected text]
    Reason: [corrector's stated reason]
    Corrected By: [legal name] — Cert No. [cert number]
    Correction Timestamp: [UTC ISO]
    Correction Hash: [SHA-256 of correction event]
```

If no corrections:
```
CORRECTION CHAIN: No corrections recorded. This record has not been amended since creation.
```

**Sub-section D: SHA-256 Record Integrity Hash (FULL — 64 CHARACTERS)**

```
RECORD INTEGRITY HASH (SHA-256)

This hash is computed from the canonical JSON payload of this maintenance record.
It may be used to verify this document has not been altered since export.

Hash Algorithm: SHA-256
Hash Input:     Canonical JSON of ordered 9-field payload (see Athelon export spec v1.0)
Computed By:    Athelon MRO Platform, Export Action v[VERSION]
Computed At:    [UTC ISO timestamp]

[FULL 64-CHARACTER HEX HASH IN MONOSPACED FONT — BOLD — PRINTED IN FULL]
[e.g.: a3f9d2c1b8e7f4a0123456789abcdef0123456789abcdef0123456789abcdef01]

PDF Artifact Hash (SHA-256 of this PDF file):
[FULL 64-CHARACTER HEX HASH OF THE RENDERED PDF BYTES]

To verify: Download the Athelon record verification tool at athelon.app/verify or
contact your FSDO. Hash mismatch indicates the document may have been altered.
```

---

## 3. CI Regression Test

### What Runs on Every Deploy

**Test file:** `tests/ci/pdf-export-regression.test.ts`  
**Runs on:** Every CI deploy (GitHub Actions / Vercel CI)  
**Framework:** Vitest + Playwright (for Gotenberg round-trip) + custom snapshot comparator  
**Runtime budget:** Must complete in under 90 seconds total

#### CI-REG-01: Template Field Coverage Assert

Validates that the rendered HTML from `renderMaintenanceRecordHTML(SYNTHETIC_MAX_PAYLOAD)` contains all required field labels. Uses a checklist of 47 required label strings (e.g., "A&P Certificate No.", "Inspection Authorization No.", "SHA-256", "QCM REVIEW", "CORRECTION CHAIN", etc.). If any label is absent, test fails with: `MISSING_REQUIRED_FIELD_LABEL: [label]`.

```typescript
const HTML = renderMaintenanceRecordHTML(SYNTHETIC_MAX_PAYLOAD);
REQUIRED_LABELS.forEach(label => {
  expect(HTML).toContain(label);
});
```

#### CI-REG-02: No-Truncation Assert (Work Performed)

The synthetic payload includes a `workPerformed` field of exactly 5,000 characters. The rendered HTML must contain the full 5,000-character string with no ellipsis (`...`) and no `overflow: hidden` on the container.

```typescript
expect(HTML).toContain(SYNTHETIC_MAX_PAYLOAD.maintenanceRecordEntry.workPerformed);
expect(HTML).not.toMatch(/overflow:\s*hidden/);
expect(HTML).not.toContain("…");
```

#### CI-REG-03: Hash Present in Full (64 Characters)

The rendered HTML must contain a sequence matching `/[0-9a-f]{64}/` in a monospaced element. The hash in the document must equal `SHA256(canonicalJSON(SYNTHETIC_MAX_PAYLOAD))`.

```typescript
const expectedHash = sha256(canonicalJSON(SYNTHETIC_MAX_PAYLOAD));
expect(HTML).toContain(expectedHash);
```

#### CI-REG-04: Cert Number Not Aliased

For each signer in the synthetic payload, the rendered HTML must contain the signer's `certNumber` verbatim (e.g., "A&P 3847261"). It must NOT contain only the username or email of that signer without the cert number also being present.

```typescript
SYNTHETIC_MAX_PAYLOAD.taskExecutionSummary.forEach(step => {
  expect(HTML).toContain(step.signerCertNumber);
  // must appear in proximity to the legal name
});
```

#### CI-REG-05: Running Header Contains N-Number on Every Page (Gotenberg Round-Trip)

This test calls the real (or test-double) Gotenberg instance with the rendered HTML of the synthetic 40-task-card payload, receives the PDF, extracts text from each page using `pdf-parse`, and asserts that the N-Number string appears on every page.

```typescript
const pdfBytes = await callGotenberg(HTML);
const pages = await extractPDFPages(pdfBytes);
pages.forEach((pageText, idx) => {
  expect(pageText).toContain(SYNTHETIC_MAX_PAYLOAD.aircraftIdentity.registration);
});
```

#### CI-REG-06: Snapshot Regression

A reference snapshot HTML string is stored in `tests/ci/snapshots/maintenance-record-snapshot.html`. On every CI run, the rendered HTML of the CANONICAL_SNAPSHOT_PAYLOAD is compared to this snapshot using a normalized diff (stripping timestamps). If the diff is non-empty, the test fails with: `PDF_TEMPLATE_REGRESSION_DETECTED — run npm run update-pdf-snapshot to review and accept changes deliberately`.

This ensures that template changes are intentional, not accidental.

#### CI-REG-07: Missing Cert Number Rejection

Verify that `exportMaintenanceRecord` action (tested via `convex-test`) throws `CERT_NUMBER_MISSING` when the payload contains a signer with an absent cert number.

#### CI-REG-08: Audit-Write Fail-Closed

Inject a database error on the `auditLog` insert during a test-environment export. Verify that the action throws, no `pdfExports` record is created, and no file is written to storage.

---

## 4. Carla's Day-One Test (Cold Scenario)

**Scenario:** Carla Ostrowski, DOM, walks in on her first day with Athelon at her new shop. She creates a work order, completes it, generates a PDF, and hands it to a hypothetical FAA inspector who has never seen Athelon and has no access to any software.

### Step-by-Step Walkthrough

**Step 1 — Create Work Order**  
User: Carla logs into Athelon. Creates a new work order for aircraft N447DE (Cessna 172S, S/N 17281234).  
Induction aircraft total time: 4,320.5 hours.  
Work type: Annual Inspection.  
Customer: Westview Flying Club.  
System state: WO opens with status OPEN. Aircraft TT at open recorded at WO creation.

**Step 2 — Add and Complete Task Cards**  
Carla adds 3 task cards:
- TC-1: Engine oil change (3 steps, all signed by A&P James Holbrook, Cert A&P 3847261)
- TC-2: Airframe inspection (5 steps, signed by A&P 3847261 for most, IA final step by IA Thomas Walsh, A&P 5512903, IA 3481221)
- TC-3: Altimeter check (2 steps, signed by A&P 3847261)

All steps completed. Timestamps recorded at atomic sign moment (not session start).

**Step 3 — Record Parts Installed**  
Oil filter: P/N CH48108, S/N N/A (consumable), 8130-3 cert ref 8130-2024-0441.  
Spark plugs (6): P/N REM37BY, S/N N/A, 8130-3 cert ref 8130-2024-0442.

**Step 4 — Log Approved Data Reference**  
Document type: FAA-approved maintenance manual  
Document number: Cessna 172S MM 172SPHBUS-00  
Revision: Rev 34  
Chapter/Section: Chapter 12, Section 12-20 (Scheduled Maintenance)

**Step 5 — QCM Review**  
QCM Marcus Webb reviews the record. Enters findings: "No findings — record accepted." Timestamp: 2026-03-01T14:22:00Z.

**Step 6 — IA Return to Service**  
IA Thomas Walsh enters the RTS certification. Full regulatory language auto-populated. He enters his IA number (IA 3481221) and A&P number (A&P 5512903). Timestamp: 2026-03-01T14:45:00Z (his atomic signature moment). Work order closes. Aircraft TT at close: 4,320.5 hours (no engine run for annual).

**Step 7 — Generate PDF**  
Carla clicks "Export Record (PDF)." System calls `exportMaintenanceRecord`. Gotenberg renders. `pdfExports` record written. `record_exported` audit event written. Signed PDF URL returned. PDF opens in new tab. Duration: 8 seconds (within SLO).

**Step 8 — What the FAA Inspector Sees**

The inspector receives a printed PDF. Without any software, they can verify:

| Inspector Question | Where in Document | Present? |
|---|---|---|
| Which aircraft? | Section 2: N447DE, Cessna 172S, S/N 17281234, TT 4,320.5h at induction | ✅ |
| Which shop? | Section 1: [Repair Station Name], FAA RS Cert 145-XXXXXX | ✅ |
| What work was done? | Section 4: Full narrative of annual inspection scope | ✅ |
| Under what approved data? | Section 4: Cessna MM 172SPHBUS-00, Rev 34, Ch 12 Sec 12-20 | ✅ |
| Who performed each step? | Section 5: James Holbrook, A&P 3847261, per step with timestamp | ✅ |
| Who did IA sign-off? | Section 8: Thomas Walsh, A&P 5512903, IA 3481221 | ✅ |
| When was RTS issued? | Section 8: 2026-03-01T14:45:00Z UTC | ✅ |
| Full RTS certification text? | Section 8: Full §43.11 language, not a summary | ✅ |
| Any discrepancies? | Section 6: (list present, all dispositioned or "none") | ✅ |
| Parts installed? | Section 7: Both parts with P/N, 8130-3 cert ref | ✅ |
| QCM reviewed? | Section 9: Marcus Webb, 2026-03-01T14:22:00Z, no findings | ✅ |
| Tamper evident? | Section 9: Full 64-char SHA-256 hash in monospaced text | ✅ |
| Correction history? | Section 9: "No corrections recorded." | ✅ |
| Page is which aircraft? | Running header: N447DE | WO-2026-0441 on every page | ✅ |
| Color required to read? | No — all information in text, no color semantics | ✅ |

**Inspector verdict (simulated):** Record stands on its face. No software required. No follow-up questions about cert numbers or timestamps. Carla's test passes cold.

---

## 5. Cilla's Test Plan

> *"PDF export is the feature a DOM uses when something has gone wrong and someone official is asking questions. I am not going to let us ship a feature that fails under those conditions."*

### TC-PDF-01 — Happy Path (Carla's Cold Test)

**Input:** Work order matching Carla's day-one scenario (3 task cards, 2 parts, IA RTS, QCM reviewed, no corrections, `workPerformed` = 2,800 chars).  
**Action:** Call `exportMaintenanceRecord({ recordId, format: "pdf" })`.  
**Expected:**
1. Action returns `{ exportVersion, generatedAt, exportHash, fileUrl, auditEventId }`.
2. `pdfExports` record created with all fields non-null.
3. `auditLog` contains one `record_exported` event with actor identity.
4. PDF rendered and retrievable via signed URL.
5. PDF contains all 9 sections in order.
6. Section 8 contains IA cert number (not name alone) and full RTS certification language.
7. Section 9 contains 64-character SHA-256 hash in monospaced element.
8. Running header on every page contains N-number.
9. `exportHash` == `SHA256(canonicalJSON(payload))`.
10. QCM review name, timestamp, and "No findings" text visible in Section 9.

**Automatable:** Yes. Assertions 1-5 on action return + DB state; assertions 6-10 on PDF text extraction via `pdf-parse`.  
**Regulatory basis:** §43.9, AC 43-9C, AC 120-78B.

---

### TC-PDF-02 — Truncation Prevention

**Input:** Work order with `workPerformed` field = exactly 5,000 characters (lorem ipsum to fill field). All other fields minimal but valid.  
**Action:** Call `exportMaintenanceRecord`.  
**Expected:**
1. Action completes without error.
2. Rendered HTML contains the full 5,000-character string (test by asserting `html.includes(fullWorkPerformedString) === true`).
3. PDF text extraction yields the full 5,000-character string (no ellipsis, no truncation at any page boundary).
4. `workPerformed` container in HTML has no `overflow: hidden`, `max-height`, or text-overflow CSS properties.
5. Document is multi-page; all pages have running N-number header.

**Fail condition:** If `html.includes(fullWorkPerformedString) === false`, test throws `TRUNCATION_DETECTED`. This is TC-PDF-02 and CI-REG-02 combined — must pass in both unit test and CI contexts.  
**Regulatory basis:** §43.9(a)(1) — "Description of work performed" must be complete.

---

### TC-PDF-03 — Missing Field Rejection

**Input A:** Work order where one signer has `certNumber = undefined`.  
**Input B:** Work order where IA signer has `iaCertNumber = undefined`.  
**Input C:** Work order where `workPerformed = ""` (empty string).  
**Action (each):** Call `exportMaintenanceRecord`.  
**Expected (each):**
1. Input A: Action throws `CERT_NUMBER_MISSING`. No PDF generated. No `pdfExports` record. No audit event. User sees: "Export failed: Certificate number missing for [signer name]. Update the signer's profile and retry."
2. Input B: Action throws `IA_CERT_NUMBER_MISSING`. Same fail-closed behavior.
3. Input C: Action throws `FIELD_TRUNCATION_DETECTED` (empty work performed is a truncation failure). No PDF. User sees actionable error.

**Fail condition:** If any of the above inputs produces a PDF instead of an error, test fails as HIGH SEVERITY.  
**Regulatory basis:** §43.9(a)(1), §43.9(a)(4).

---

### TC-PDF-04 — Hash Verification

**Input:** Fully valid work order. Export called twice.  
**Action:** Call `exportMaintenanceRecord` once, capture `exportHash`. Call again with no changes to record, capture second `exportHash`.  
**Expected:**
1. Both `exportHash` values are identical (deterministic hash of same payload).
2. `exportHash` == `SHA256(canonicalJSON(getMaintenanceRecordFullExportPayload(recordId)))`.
3. Manually alter `workPerformed` in the DB after first export. Call `exportMaintenanceRecord` again. New `exportHash` differs from first. Old `pdfExports` record has `supersededBy` set to new export ID.
4. Both hash values are 64-character lowercase hex strings matching `/^[0-9a-f]{64}$/`.
5. Both hashes appear in full in their respective PDF documents (extracted via `pdf-parse`).

**Automatable:** Yes. SHA-256 is deterministic; assertion 1 verifies determinism. Assertion 3 verifies supersession chain. Assertion 5 verifies the hash is on the document face, not only in the DB.  
**Regulatory basis:** AC 120-78B §5 (audit trail integrity).

---

### TC-PDF-05 — CI Regression Trigger

**Input:** Modify `renderMaintenanceRecordHTML` to remove the IA certificate number label from Section 8 (simulate a developer accidentally deleting a field).  
**Action:** Run CI suite (`npm run test:ci`).  
**Expected:**
1. `CI-REG-01` fails with `MISSING_REQUIRED_FIELD_LABEL: "Inspection Authorization No."`.
2. CI build is marked RED (non-zero exit code).
3. Pull request cannot be merged while this failure exists.
4. `CI-REG-06` (snapshot regression) also fails because the HTML snapshot differs.
5. No PDF artifact is deployed to production with the missing field.

**Automatable:** Yes. Shell script: modify template, run CI, assert non-zero exit code and specific error message in output.  
**Regulatory basis:** Regression prevention; MWC-A-17 compliance requirement.

---

### TC-PDF-06 — Carla Cold-Test Scenario (Full End-to-End)

**Input:** Exactly the work order described in Section 4 (Carla's day-one test): 3 task cards, 2 parts, IA RTS, QCM reviewed, no corrections, `workPerformed` describing an annual inspection in full prose.  
**Action:** Create WO via API → complete all task card steps → sign each step → QCM review → IA RTS → call `exportMaintenanceRecord` → download PDF → extract all text → run checklist assertions.  
**Expected (47 assertions, automatable):**

All fields in the inspector verification table (Section 4 Step 8) are present in the PDF text. Specifically:

1. N-number (N447DE) appears in PDF header text on every page.
2. Repair station cert number (145-XXXXXX) in Section 1.
3. Aircraft make/model/serial in Section 2.
4. Total time at induction in Section 2.
5. Work order number in Section 3.
6. Completion date in Section 3.
7. Full `workPerformed` text in Section 4 (no truncation).
8. Approved data document type in Section 4.
9. Approved data document number in Section 4.
10. Approved data revision in Section 4.
11. Approved data chapter/section in Section 4.
12. All 3 task cards listed in Section 5 (TC-1, TC-2, TC-3 titles).
13. A&P cert number 3847261 appears in Section 5 (James Holbrook's rows).
14. IA cert number 3481221 appears in Section 5 (Thomas Walsh's IA step).
15. A&P cert number 5512903 appears in Section 5 (Thomas Walsh's A&P number).
16. All task card steps show completion timestamp (not session-start time).
17. Parts installed section (Section 7) contains "CH48108" (oil filter P/N).
18. Parts installed section contains 8130-3 cert ref "8130-2024-0441".
19. Parts installed section contains "REM37BY".
20. RTS section (Section 8) contains full maintenance release statement text (verify first 80 chars of regulatory language).
21. RTS section contains "Thomas Walsh".
22. RTS section contains "IA 3481221".
23. RTS section contains "A&P 5512903".
24. RTS timestamp is "2026-03-01T14:45:00Z" (not session start time).
25. QCM review block contains "Marcus Webb".
26. QCM review block contains "No findings — record accepted".
27. QCM review timestamp is "2026-03-01T14:22:00Z".
28. Correction chain section present.
29. Correction chain says "No corrections recorded."
30. SHA-256 hash block present (regex `/[0-9a-f]{64}/` matches in PDF text).
31. Full 64-character hash value matches `SHA256(canonicalJSON(payload))`.
32. Export timestamp present in footer.
33. Exporter identity (Carla's name) present in footer.
34. Template version present in footer.
35. Page 1 of N header present.
36. No color-only semantics: audit manually (screenshot to grayscale, verify all text readable).
37-47. (Additional per-field assertions for discrepancy section, work order type, customer name, aircraft serial, aircraft model, repair station address, repair station ratings, RTS "annual inspection" language, part removed section absent or "none", no "N/A" cert numbers without explicit notation, export successfully retrievable via signed URL.)

**Pass criteria:** All 47 assertions green. Any failure = FAIL, test case named and logged.  
**Regulatory basis:** Carla's acceptance criteria per Phase 15 R&D brief. MWC-A-11.

---

## 6. Marcus Webb Compliance Checklist

### Applicable Regulations

- **14 CFR §43.9** — Maintenance records
- **14 CFR §43.9(a)(1)** — Description of work performed (complete, not summarized)
- **14 CFR §43.9(a)(2)** — Approved data used (structured reference)
- **14 CFR §43.9(a)(3)** — Date of work completion
- **14 CFR §43.9(a)(4)** — Name, signature, and certificate number
- **14 CFR §43.11(a)** — Return to service entry
- **AC 43-9C Section 6** — Minimum content for maintenance record entries
- **AC 120-78B §4** — Electronic signature requirements
- **AC 120-78B §5** — Audit trail requirements
- **AC 120-78B §5.d** — Alteration control (correction chain)

### Pre-Release Compliance Sign-Off Items

| Item | Requirement | Regulatory Basis | Hard Blocker | Verified By |
|---|---|---|---|---|
| MWC-C-01 | Every signing technician's A&P certificate number appears verbatim in Section 5 of the PDF — not username, not employee ID, not name alone. Cert number is a regulatory minimum, not a UI preference. | §43.9(a)(4) | **YES** | Cilla TC-PDF-06 assertions 13-14; automated check CI-REG-04 |
| MWC-C-02 | IA certificate number appears separately from A&P number in Section 8. Both numbers labeled distinctly ("A&P Certificate No." and "Inspection Authorization No."). Inspector must be able to verify IA authority without software. | §43.9(a)(4), AC 120-78B §4.a.2 | **YES** | TC-PDF-06 assertions 21-23; CI-REG-01 label check |
| MWC-C-03 | `workPerformed` field renders in FULL — no truncation at any character count. CI test CI-REG-02 enforces this on every deploy. If this test can be bypassed by a developer, MWC-C-03 is not satisfied. | §43.9(a)(1) | **YES** | TC-PDF-02; CI-REG-02 |
| MWC-C-04 | Approved data reference is a structured 4-field object (document type, document number, revision, chapter/section) — not a free-text summary. All four fields must be non-empty for the export to proceed. | §43.9(a)(2), AC 43-9C §6.b | **YES** | TC-PDF-03 (missing field rejection); TC-PDF-06 assertions 7-11 |
| MWC-C-05 | Signature timestamp is the `signedAt` field from the atomic `signatureAuthEvent` — not session start time, not `createdAt` of the task card. Audit event timestamp for the atomic signature action is the canonical timestamp. Verified by comparing `signedAt` to `sessionStartAt` in test environment (must differ by test design). | §43.9(a)(3), AC 120-78B §5.a | **YES** | TC-PDF-06 assertion 16 |
| MWC-C-06 | SHA-256 hash of the record appears in full (64 hexadecimal characters) on the face of the printed document — in the body of Section 9, in monospaced font, not only in the app UI or only in an appendix reference field. An inspector holding the paper must be able to read and record the full hash. | AC 120-78B §5 | **YES** | TC-PDF-04; TC-PDF-06 assertions 30-31; CI-REG-03 |
| MWC-C-07 | Correction chain fully visible when a correction has been made: original value, corrected value, corrector identity, corrector certificate number, correction timestamp, and stated reason. When no correction: explicit statement "No corrections recorded." Never silent. | AC 120-78B §5.d | **YES** | TC-PDF-06 assertions 28-29; explicit "No corrections" test case in TC-PDF-03 variant |
| MWC-C-08 | QCM review state explicitly stated in Section 9 in all cases. If reviewed: reviewer identity, timestamp, findings. If not reviewed: "QCM REVIEW NOT RECORDED AT TIME OF EXPORT." — this text is mandatory, printed in bold, not soft-omitted. | AC 120-78B §5, Part 145 §145.211 | **YES** | TC-PDF-06 assertions 25-27; separate test case: export WO with no QCM review → verify explicit "not recorded" text present |
| MWC-C-09 | `record_exported` audit event is written atomically before any PDF is returned to the caller. If the audit write fails (DB error injection), the action throws and no PDF URL is returned. Test TC-PDF-08 (audit-write failure) must pass at mutation level, not only in UI. | AC 120-78B §5 (chain of custody) | **YES** | CI-REG-08; TC-PDF-08 (referenced in WS15-A test plan as PDF-10) |
| MWC-C-10 | RTS section of export includes full maintenance release statement text (≥the 4-clause regulatory statement specified in Section 2 of this document), IA certificate number, IA A&P number, and timestamp. Not IA name alone. Inspector must be able to look up the IA's current certificate status using the number in this document. | §43.9, §43.11(a), AC 120-78B §4.a.2 | **YES** | TC-PDF-06 assertions 20-24 |
| MWC-C-11 | TC-PDF-01 through TC-PDF-06 all pass with QA sign-off in a witnessed session. Carla Ostrowski's acceptance test (TC-PDF-06) must be run with Carla present or with recorded evidence of the output that Carla reviews and signs off on. Her signature on the acceptance test record is the regulatory dossier entry for this feature. | Operational validation; MWC-A-11 | **YES** | Carla's signed acceptance test record |
| MWC-C-12 | Export for open (in-progress) work orders correctly marks unsigned steps "PENDING" and RTS section "NOT AUTHORIZED AT TIME OF EXPORT." No ambiguity about completeness. An open-WO PDF must be clearly distinguishable from a closed-WO PDF even in isolation. | AC 43-9C §6 | YES | Standalone test: export WO with 2 of 5 steps incomplete → verify "PENDING" text in Section 5, "NOT AUTHORIZED" in Section 8 |
| MWC-C-13 | N-number appears in the running page header on every page of a multi-page document. Verified by Gotenberg round-trip in CI-REG-05 against a synthetic 40-task-card payload. | AC 43-9C §6 (identifiability) | YES | CI-REG-05 |
| MWC-C-14 | All installed parts with P/N, S/N, and 8130-3 certificate reference appear in Section 7. If a part has no 8130-3 reference in the system, the row explicitly states "8130-3 reference not on file" rather than leaving the field blank. | §43.9(a)(1), Part 145 §145.109 | YES | TC-PDF-06 assertions 17-19 |
| MWC-C-15 | CI regression test suite (CI-REG-01 through CI-REG-08) is a required step in the CI/CD pipeline. No merge to main is permitted while any CI-REG test is failing. Pipeline configuration is reviewed and signed by Devraj and Jonas before release. | Regression prevention; MWC-A-17 | YES | CI pipeline config review |
| MWC-C-16 | Export template version number is embedded in document footer. Enables identification of which template version produced a document when reviewing historical records. | Operational auditability | No | CI-REG-01 label check for footer version string |

**Marcus's personal sign-off statement:**

> "I will be in the room for the Carla acceptance test. I will review the printed PDF against each item in this checklist. My signature on the acceptance test record is the compliance attestation for this feature. No release tag is applied until that signature exists and is filed in the regulatory dossier."

---

## Implementation Sequencing

| Sprint Day | Task | Owner |
|---|---|---|
| 1-2 | Provision Gotenberg on Fly.io; Jonas spike on cold-start latency and keep-alive pattern | Jonas |
| 1-3 | Write `renderMaintenanceRecordHTML` template function (all 9 sections); write CI-REG-01..04 against template | Devraj |
| 3-4 | Write `getMaintenanceRecordFullExportPayload` internal query with all validation rules | Devraj |
| 4-5 | Write `exportMaintenanceRecord` Convex action; fail-closed audit write; `pdfExports` table migration | Devraj |
| 5-6 | Wire Gotenberg call in action; PDF artifact storage; signed URL return | Jonas |
| 6 | CI-REG-05 (Gotenberg round-trip N-number header check) | Jonas |
| 7 | CI-REG-06 snapshot baseline; CI-REG-07 rejection tests; CI-REG-08 audit-write failure | Devraj |
| 7-8 | `ExportRecordButton` component; `ExportHistoryPanel`; print route for preview | Chloe Park |
| 9-10 | TC-PDF-01 through TC-PDF-06 full run with QA witness | Cilla + Devraj |
| 10 | Carla acceptance test (scheduled call; printed PDF reviewed live) | Carla + Marcus + Devraj |
| 10 | Marcus compliance sign-off; release tag applied | Marcus |

---
*Filed: 2026-02-22 | Phase 16 Build Execution | WS16-C*
