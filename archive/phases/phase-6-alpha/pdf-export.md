# Athelon Phase 6 Alpha: PDF Export
Author: Devraj Anand (Backend)
Contributors: Chloe Park (Frontend notes), Finn Alvarez (Print notes)
Date: 2026-02-22
Status: Required for alpha re-test

## 0) Context and hard stop
PDF export was deferred to v1.1 in MVP scope.
Carla’s day-one pilot test explicitly un-deferred it.
She validated in-app record fidelity, then failed release because no export button existed.
Her exact operational objection: “Screens turn off.”
This document defines what we build now for a DOM who has survived FAA audits,
not for an internal product demo.

## 1) What Carla actually needs (job-to-be-done)
Carla is not asking for a convenience download.
She is asking for a stand-alone maintenance record package that survives loss of app access,
loss of account access, and loss of vendor continuity.
The output must let a DOM hand a complete, intelligible, defensible packet to an FAA inspector.
The packet must answer, in inspector order, without live software assistance.

### 1.1 Inspector-order narrative the document must satisfy
1) Who performed the work?
2) Under what Part 145 authorization?
3) Which aircraft and work order are we discussing?
4) What maintenance was performed under §43.9?
5) Who signed, with what cert number, and when?
6) Is tamper evidence visible and explainable?
7) Was any post-sign correction made with original preserved?
8) Did QCM review occur where applicable?
9) Is the audit timeline complete and readable on paper?

### 1.2 Non-negotiables from Carla profile + pilot report
- Signature identity linked to certificate number, not login alias.
- Signature timestamp tied to action moment, not session start.
- Reversal/correction shown as additive chain, never overwrite.
- Export legible without database lookups.
- Full text visible for legally material fields.
- Printed output remains useful in grayscale hard-copy workflow.

### 1.3 What “pass” means in her world
If she cannot hand the printout to an inspector and say, “This is complete on its face,” it fails.
If hash or cert details are hidden behind app-only interactions, it fails.
If correction logic exists in DB but not on paper, it fails.
If any core §43.9 text is truncated, it fails.
If output order forces interpretation instead of reading, it fails.

[FINN] Output should read as a records packet, not a screenshot of app sections.

## 2) Convex Node.js action spec: `exportMaintenanceRecord(recordId)`

### 2.1 Purpose and placement
This action is the export orchestration layer.
It reuses `getMaintenanceRecordAuditTrail` as primary data source,
assembles ordered export payload,
returns JSON and/or PDF artifact,
and writes mandatory `record_exported` audit event.
No duplicate business logic in rendering layer.

### 2.2 Signature
```ts
export const exportMaintenanceRecord = action({
  args: {
    recordId: v.id("maintenanceRecords"),
    format: v.optional(v.union(v.literal("json"), v.literal("pdf"), v.literal("both"))),
  },
  handler: async (ctx, args) => { /* ... */ }
});
```

### 2.3 Auth and scope
- Auth guard: `requireOrgMembership(ctx, "viewer")`
- Record must exist
- Record org must match caller org
- Export allowed regardless of WO status (open/closed), with completeness state explicit

### 2.4 Action flow
1) Validate caller and record ownership.
2) Call `getMaintenanceRecordAuditTrail({ recordId })`.
3) Pull related WO/org/aircraft context needed for header.
4) Assemble ordered 9-field payload (strict key order).
5) Serialize structured JSON (always).
6) If `format` includes PDF, render print route artifact from same payload.
7) Write `record_exported` audit entry on every successful call.
8) Return payload plus metadata.

### 2.5 Ordered 9-field export object (per deployment §5)
`ordered43_9Export` strict order:
1. `repairStationIdentity`
2. `aircraftIdentity`
3. `workOrderIdentity`
4. `taskExecutionSummary`
5. `maintenanceRecordEntry`
6. `discrepancyDispositionSummary`
7. `returnToServiceSummary`
8. `adComplianceSummary`
9. `fullAuditTrail`

Serializer enforces order.
Client cannot reorder.
Ordering is a compliance-readability requirement, not cosmetics.

### 2.6 Field content expectations
`repairStationIdentity`
- legalName
- part145CertificateNumber
- address

`aircraftIdentity`
- registration (normalized N-number)
- make
- model
- serialNumber

`workOrderIdentity`
- workOrderNumber
- workOrderType
- openedAt
- closedAt
- aircraftTotalTimeAtOpen
- aircraftTotalTimeAtClose

`taskExecutionSummary`
- taskCards[] with step number/status/timestamp/signer legal name/cert number

`maintenanceRecordEntry`
- recordType
- workPerformed (full text, no truncation)
- approvedDataReference (full structured value)
- partsReplaced[] with P/N, S/N, 8130/trace reference
- completionDate
- signature fields snapshot
- signature hash fields

`discrepancyDispositionSummary`
- discrepancy number
- description
- disposition
- corrective action linkage

`returnToServiceSummary`
- RTS statement
- IA name
- IA cert number / authorization where present
- RTS signature timestamp
- RTS hash

`adComplianceSummary`
- applicable AD list with compliance and due references

`fullAuditTrail`
- relevant audit events with actor identity and timestamp

### 2.7 JSON format rules
- No lossy transform of long fields
- Keep epoch timestamps + ISO mirrors
- Keep hash strings exact
- Preserve null explicitly; do not drop undefined silently
- Include `hashVerification` block from audit-trail query
- Include correction chain block even when empty

[CHLOE] Explicit null keeps print template deterministic.

### 2.8 `record_exported` audit event (mandatory)
Every successful export call inserts:
- eventType: `record_exported`
- tableName: `maintenanceRecords`
- recordId
- userId (exporter)
- timestamp
- notes: format + exportVersion + fileName where applicable

Not optional, and not format-dependent.
JSON-only export still writes `record_exported`.

### 2.9 Return shape
```ts
{
  exportVersion: "1.0",
  generatedAt: number,
  recordId: Id<"maintenanceRecords">,
  exportFormat: "json" | "pdf" | "both",
  ordered43_9Export: Ordered43_9Export,
  files?: {
    pdf?: { fileName: string; mimeType: "application/pdf"; base64: string; }
  },
  audit: {
    eventType: "record_exported";
    auditEventId: Id<"auditLog">;
    exportedBy: string;
    exportedAt: number;
  }
}
```

### 2.10 Error codes
- `MR_NOT_FOUND`
- `MR_ORG_MISMATCH`
- `EXPORT_LAYOUT_INVALID`
- `EXPORT_RENDER_FAILED`
- `EXPORT_AUDIT_WRITE_FAILED`

Fail closed: no successful payload without audit write.

## 3) PDF rendering approach: options and recommendation

### 3.1 Option (a): server-side HTML→PDF via Puppeteer in Convex action
Pros:
- deterministic environment
- consistent artifact generation path
- archival reproducibility
Cons:
- heavier runtime + Chromium management
- higher cold-start and timeout risk
- more operational complexity for immediate pilot blocker

### 3.2 Option (b): client-side jsPDF/html2canvas
Pros:
- quick to prototype
- no backend render infra
Cons:
- rasterized output risks text clarity and selectability
- pagination instability across browsers/devices
- clipping risk on long legal text
- weak audit-grade confidence

### 3.3 Option (c): structured JSON from action; client print route (`@media print`)
Pros:
- backend owns canonical data assembly
- frontend uses semantic HTML (text-first)
- easier to verify no truncation and stable ordering
- fast implementation and iteration with Carla
- lower infra risk during alpha window
Cons:
- browser print engines vary slightly; CSS discipline required

### 3.4 Devraj recommendation
Recommend option (c) for alpha.
It is the fastest path to defensible print output while preserving canonical backend contract.
It minimizes runtime risk and avoids PDF engine operational overhead.
It also preserves migration path: we can add server-rendered PDF later without breaking JSON contract.

### 3.5 Chloe print implementation annotation
[CHLOE] Build dedicated route:
`/work-orders/:workOrderId/records/:recordId/print`.
No app shell, no sidebars, single legal-document column,
strict section components,
`@page { size: Letter; margin: 0.5in; }`.
Use `break-inside: avoid` for signature, correction, and QCM blocks.
Use text-first, grayscale-safe styling only.

[CHLOE] Section order must be payload-key order, not view heuristics.
If data missing, render explicit “Not recorded” row; never silent omission.

## 4) Printed document layout spec (Finn)

### 4.1 Paper-level constraints
- US Letter
- 0.5in margins
- Body 10.5pt
- Headings 12.5pt
- Black/white only semantics
- Footer page number: `Page X of Y`
- Footer export stamp: exportedAt, exportedBy, exportVersion

[FINN] If meaning depends on color, assume failure on copier.

### 4.2 Page 1 header
Top block order:
1) Repair station identity
2) Aircraft identity
3) Work order identity + export date

Required fields:
- Shop legal name
- Part 145 cert number
- Address
- N-number
- Make/model/serial
- WO number
- Generated date/time

[FINN] Inspector scan pattern is who/what/job first.

### 4.3 Body section: “Maintenance Record Package”
Render all nine ordered sections exactly:
1. Repair station identity snapshot
2. Aircraft snapshot
3. WO lifecycle data
4. Task execution summary
5. Maintenance record entry
6. Discrepancy disposition summary
7. RTS summary
8. AD compliance summary
9. Full audit timeline

### 4.4 Signature block
Dedicated boxed area title:
“Signature Attestation and Integrity”

Fields:
- signer legal name
- signer cert number
- IA cert/authorization if applicable
- signature timestamp
- signature auth event reference
- full SHA-256 hash (64-char)
- verification status (IDENTICAL/MISMATCH)

[FINN] Hash appears as full monospaced text, never badge-only.

### 4.5 Correction chain block
If correction exists, render:
- original record reference
- corrected-by record reference
- corrected field(s)
- original value
- corrected value
- correction reason
- corrector identity and cert
- correction timestamp

Original entry remains visible.
No replacement-in-place.
If none exists, print explicit line: “No corrections recorded.”

### 4.6 QCM review block
If QCM reviewed event exists, include:
- reviewer name
- reviewer role/cert context
- review timestamp
- findings notes (full text)

If no QCM review yet, print explicit state:
“QCM review not recorded at export time.”

[FINN] Missing review is audit-relevant and must be visible.

### 4.7 Pagination rules
- prevent orphan section titles
- avoid splitting signature block across pages
- allow long workPerformed text to flow naturally
- add “(continued)” labels for multi-page sections

### 4.8 Appendix section
Last-page appendix includes machine references:
- record IDs
- work order ID
- signatureAuthEvent IDs
- hash values full
- export audit event ID (`record_exported`)

Purpose: correlation capability without cluttering first pages.

## 5) Carla acceptance test (written from her perspective)
I am holding printed output, not navigating UI.
This passes only if page content itself is defensible.

### 5.1 Identity and authority checks
I confirm:
- shop legal name correct
- Part 145 cert number present and correct
- aircraft tail number correct
- WO number/date context present
Any mismatch is immediate fail.

### 5.2 Signature identity checks
I confirm:
- signer name present
- A&P cert number present and correct
- IA cert/authorization shown where applicable
- timestamp reflects action time of signature
If cert data is missing, wrong, or merged improperly, fail.

### 5.3 Maintenance content checks
I confirm:
- work performed text fully visible
- approved data reference complete and specific
- parts trace fields present where applicable
Any truncation or clipping of substantive text fails.

### 5.4 Integrity checks
I confirm:
- full SHA-256 hash visible
- verification state visible and understandable
- record contains enough to support verification workflow
If hash is partial, hidden, or app-only, fail.

### 5.5 Correction chain checks
If correction exists, I must see original and correction relationship,
including reason and changed values.
If no correction, I expect explicit no-correction line.
Ambiguity fails.

### 5.6 QCM state checks
If review complete, I expect reviewer identity, timestamp, notes.
If not complete, I expect explicit not-recorded state.
Silent absence fails.

### 5.7 Paper workflow checks
I print from Chrome on my actual workstation and verify:
- readable grayscale output
- stable pagination
- no orphaned headers
- no split signature block
- page numbering intact
If readability depends on color or hover/UI state, fail.

### 5.8 Passing statement
I pass when I can honestly say:
“I can hand this to an inspector as-is,
with cert identity,
integrity evidence,
correction visibility,
and no truncated legal content.”

## 6) Delivery plan for alpha re-test
1) Implement action + ordered serializer + mandatory audit write.
2) Add Export action in WO header and record detail actions.
3) Implement dedicated print route from ordered payload.
4) Add regression tests:
   - long `workPerformed` no truncation
   - correction chain visible
   - QCM conditional block behavior
   - full hash render
   - `record_exported` event always written
5) Run Carla script end-to-end on pilot data.

[CHLOE] CTA label should be `Export Record (Print/PDF)`.
She is explicitly testing paper survivability.

[FINN] First page must answer who/what/job in three seconds.
If that scan fails, inspector confidence drops immediately.

## 7) Final position
Backend already captures defensible record data.
Pilot blocker was document survivability, not data integrity.
This spec closes that gap with fixed ordered export payload,
mandatory `record_exported` chain-of-custody logging,
print-optimized layout built for real audit handling,
and acceptance criteria matching Carla’s exact checks.
Ship this, retest, clear the alpha hard stop.