# Data Migration Technical Architecture
## Athelon MRO SaaS — Research Document 04

**Prepared for:** Athelon Engineering & Product
**Date:** 2026-03-12
**Scope:** Technical architecture and implementation patterns for data migration infrastructure in the Athelon platform, with specific consideration for Convex serverless backend, FAA regulatory compliance, and MRO-specific data models.

---

## Table of Contents

1. [Migration System Architecture](#1-migration-system-architecture)
2. [Import Pipeline Design](#2-import-pipeline-design)
3. [Schema Mapping Engine](#3-schema-mapping-engine)
4. [Conflict Resolution](#4-conflict-resolution)
5. [Idempotent Migration](#5-idempotent-migration)
6. [API-Based Migration](#6-api-based-migration)
7. [Audit Trail and Compliance](#7-audit-trail-and-compliance)
8. [Multi-Tenant Migration Isolation](#8-multi-tenant-migration-isolation)
9. [Testing Migration Pipelines](#9-testing-migration-pipelines)
10. [Migration Monitoring and Observability](#10-migration-monitoring-and-observability)
11. [File and Document Migration](#11-file-and-document-migration)
12. [Relational Data Migration](#12-relational-data-migration)
13. [Timezone, Date, and Unit-of-Measure Normalization](#13-timezone-date-and-unit-of-measure-normalization)
14. [Convex-Specific Implementation Patterns](#14-convex-specific-implementation-patterns)
15. [Recommendations and Implementation Roadmap](#15-recommendations-and-implementation-roadmap)

---

## 1. Migration System Architecture

### 1.1 Migration as a First-Class Feature

The most important architectural decision is whether migration is a first-class feature or a bolt-on tool. The evidence from MRO software sales strongly favors first-class treatment.

**The bolt-on anti-pattern** treats migration as a one-time project run by an implementation engineer with ad-hoc scripts. It produces:
- No visibility for customers during the process
- No retry capability when partial failures occur
- No audit trail mapping migrated data back to its source
- No way to verify completeness after the fact
- Technician distrust of data that "appeared from nowhere"

**First-class migration** treats data import as a persistent subsystem with its own schema tables, UI surfaces, access controls, and monitoring. For Athelon, this means:
- A `migrationJobs` table in the Convex schema tracking every import operation lifecycle
- A `migrationEvents` table providing a step-level audit log per job
- A `fieldMappingTemplates` table storing reusable source-to-target column maps per competitor system
- A dedicated UI section (e.g., `/settings/data-migration`) surfacing job status, errors, and history to org admins
- Migration functions in a separate `convex/migration*.ts` namespace, clearly separated from business logic

The separation matters because migration code has fundamentally different invariants than product code. Business logic functions must be fast, safe, and user-facing. Migration functions run over large datasets, tolerate partial failures, need idempotency, and produce provenance metadata that business logic functions never need to emit.

### 1.2 Subsystem Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Customer Browser (React 19 + Convex useQuery/useMutation)          │
│                                                                     │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ File Upload UI │  │ Mapping Editor   │  │ Job Status Panel   │  │
│  │ (CSV / Excel)  │  │ (field mapper)   │  │ (progress, errors) │  │
│  └───────┬────────┘  └────────┬─────────┘  └────────────────────┘  │
└──────────│──────────────────-─│─────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Convex Backend                                                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Migration Orchestration Layer (convex/migrationJobs.ts)     │   │
│  │  createJob → validate → plan → enqueue batches → finalize    │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                    │
│         ┌───────────────────────┼───────────────────────┐           │
│         ▼                       ▼                       ▼           │
│  ┌──────────────┐  ┌──────────────────────┐  ┌─────────────────┐   │
│  │ Schema       │  │ Conflict Resolution  │  │ Transform       │   │
│  │ Mapper       │  │ Engine               │  │ Functions       │   │
│  │ (field maps) │  │ (dedup, merge)       │  │ (normalizers)   │   │
│  └──────────────┘  └──────────────────────┘  └─────────────────┘   │
│                                 │                                    │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer (existing convex/*.ts)                 │   │
│  │  aircraft, parts, customers, workOrders, maintenanceRecords  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Convex File Storage  ←  migrated PDFs, 8130-3 images        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 Separation of Concerns

The migration subsystem must not call business logic mutations directly. Instead:

- Business logic mutations validate as if data came from a live user (strict, throw on bad input).
- Migration ingest functions write directly to `ctx.db` after their own validation pass, emitting provenance metadata that business mutations never produce.
- This means migration functions duplicate some write logic, which is intentional — they need different error handling (log and continue, not throw) and different metadata (source system ID, batch ID, migration job ID).

**The rule:** Never call `importAircraft` from another migration function. Write a dedicated `migrateAircraftFromCamp` internal mutation that does its own validation and writes with full provenance fields.

---

## 2. Import Pipeline Design

### 2.1 Pipeline Stages

A complete import pipeline for Athelon has seven discrete stages:

```
UPLOAD → PARSE → VALIDATE → MAP → TRANSFORM → CONFLICT-CHECK → LOAD
```

Each stage is a separate responsibility. Failures at any stage produce structured error reports, not crashes. The job record tracks which stage the import is currently in.

**Stage 1 — Upload**
The customer uploads a file (CSV, Excel, JSON export). Convex file storage handles this identically to any other file: `generateUploadUrl` → client POST → `storeFileMetadata`. The file is stored with `linkedEntityType: "migrationJob"` and `linkedEntityId: jobId`. This makes the raw source file permanently auditable — you can always retrieve exactly what was uploaded.

**Stage 2 — Parse**
A Convex action (Node.js runtime via `"use node"`) reads the uploaded file bytes via `ctx.storage.getUrl()` and parses them into a structured row array. CSV parsing handles quoted fields, different line endings, BOM markers, and multi-sheet Excel. The output is a normalized JSON array stored as a `migrationBatch` document.

**Stage 3 — Validate**
Row-by-row validation against the target schema. Each row gets a validation status: `valid`, `warning`, or `error`. Warnings (e.g., unknown aircraft category) do not block import but are flagged. Errors (e.g., missing required tail number) block that row. The entire batch can be reviewed before any write occurs.

**Stage 4 — Map**
Apply the saved field mapping template for the source system (CAMP, Corridor, AvSight, custom). Maps source column names to Athelon schema field names, handles default values for missing columns, and applies any transformation rules defined in the template.

**Stage 5 — Transform**
Apply normalization functions: date format conversion, timezone normalization, unit conversion (hours to decimal, weight units), enum value translation (source system condition codes → Athelon condition literals), phone number formatting, ICAO airport code lookup.

**Stage 6 — Conflict Check**
Query existing data for potential duplicates before writing. This stage generates a `conflictReport` attached to the job. The UI surfaces conflicts for human review. Auto-resolution rules (configurable per org) handle clear cases; ambiguous cases block the relevant rows pending user decision.

**Stage 7 — Load**
Write records that are validated, mapped, transformed, and conflict-resolved. Each write emits an `auditLog` entry with `migrationJobId` and `sourceRecordId` provenance fields. Partial success is normal — rows that fail during load are logged with error detail, and the job can be retried for failed rows only.

### 2.2 Async Processing for Large Imports

Convex mutations have execution time limits. A 10,000-row aircraft import cannot run in a single mutation. The solution is batch scheduling via Convex's internal mutation chaining pattern.

**Batch size guidance:**
- Aircraft records: 50 rows per mutation (each write triggers audit log + potential CAMP linkage audit)
- Parts records: 100 rows per mutation (simpler writes, fewer cascades)
- Maintenance records: 20 rows per mutation (complex schema, multiple related writes)
- Documents: 10 files per batch (file operations are I/O-heavy)

**Scheduling pattern in Convex:**

```
createMigrationJob (mutation)
  → validates job parameters
  → inserts migrationJob record with status: "queued"
  → schedules processMigrationBatch via ctx.scheduler.runAfter(0, ...)

processMigrationBatch (internal mutation)
  → reads next N rows from migrationBatch
  → processes rows
  → updates job progress counter
  → if more rows remain: schedules itself again via ctx.scheduler.runAfter(0, ...)
  → if done: updates job status to "completed" or "completed_with_errors"
```

This self-chaining pattern is the correct Convex approach to long-running background work. It avoids the need for external job queues (BullMQ, SQS) and keeps all state in the Convex database where it's observable and reactive.

### 2.3 Progress Tracking

The `migrationJobs` table needs the following progress fields:

```typescript
// In schema.ts migrationJobs table
totalRows: v.number(),
processedRows: v.number(),
successRows: v.number(),
warningRows: v.number(),
errorRows: v.number(),
currentStage: v.union(
  v.literal("queued"),
  v.literal("parsing"),
  v.literal("validating"),
  v.literal("mapping"),
  v.literal("conflict_check"),
  v.literal("loading"),
  v.literal("completed"),
  v.literal("completed_with_errors"),
  v.literal("failed"),
  v.literal("cancelled"),
),
startedAt: v.optional(v.number()),
completedAt: v.optional(v.number()),
estimatedCompletionAt: v.optional(v.number()),
```

The frontend uses `useQuery(api.migrationJobs.getJobStatus, { jobId })` to reactively display a progress bar. Because Convex queries are reactive, the progress updates automatically without polling.

---

## 3. Schema Mapping Engine

### 3.1 Architecture

The mapping engine is a configuration-driven transform layer. It answers: "Given a row from source system X, how do I produce a valid Athelon record of type Y?"

The mapping engine has three layers:

1. **Structural mapping** — which source column maps to which target field
2. **Value transformation** — how to convert a source value to the target enum/format
3. **Computed fields** — target fields derived from multiple source fields or computed from source values

### 3.2 Field Mapping Template Schema

```typescript
// migrationFieldMappingTemplates table
{
  organizationId: v.id("organizations"),
  sourceSystem: v.union(
    v.literal("camp"),           // CAMP Systems
    v.literal("corridor"),       // Corridor MSP
    v.literal("avsight"),        // AvSight
    v.literal("traxxall"),       // Traxxall
    v.literal("avmro"),          // AvMRO
    v.literal("excel_custom"),   // Customer-built Excel
    v.literal("csv_custom"),     // Generic CSV
  ),
  targetEntity: v.union(
    v.literal("aircraft"),
    v.literal("parts"),
    v.literal("customers"),
    v.literal("workOrders"),
    v.literal("maintenanceRecords"),
    v.literal("taskCards"),
  ),
  templateName: v.string(),
  isDefault: v.boolean(),          // one default per (org, sourceSystem, targetEntity)
  fieldMappings: v.array(v.object({
    sourceColumn: v.string(),      // exact column name from source file header
    targetField: v.string(),       // dot-notation path in Athelon schema
    required: v.boolean(),
    transformType: v.union(
      v.literal("direct"),         // copy value as-is
      v.literal("lookup"),         // enum translation table
      v.literal("date_parse"),     // date string → Unix ms
      v.literal("computed"),       // derived from other fields via formula
      v.literal("constant"),       // always use a fixed value
      v.literal("ignore"),         // skip this source column
    ),
    lookupTable: v.optional(v.array(v.object({
      sourceValue: v.string(),
      targetValue: v.string(),
    }))),
    dateFormat: v.optional(v.string()),       // e.g., "MM/DD/YYYY", "YYYY-MM-DD"
    dateTimezone: v.optional(v.string()),     // IANA timezone if source has local times
    computedExpression: v.optional(v.string()),  // safe expression string
    constantValue: v.optional(v.string()),
    defaultValue: v.optional(v.string()),    // if source column is missing or empty
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdByUserId: v.string(),
}
```

### 3.3 Prebuilt Templates for MRO Competitors

Each major competitor system has known export formats. Maintain prebuilt templates for:

**CAMP Systems** exports: aircraft list, component list, AD status export, work order export. CAMP uses numeric aircraft IDs, "N-number" format for tail (without leading N), and date format MM/DD/YYYY. The existing `bulkImport.ts` already handles CAMP aircraft ID linkage — the mapping engine should generate `campAircraftId` from CAMP's `AC_ID` column.

**Corridor MSP** exports: work order CSV, parts inventory, customer list. Corridor uses its own work order numbering (e.g., `WO-YYYY-NNNNN`), which must be preserved as `sourceSystemWONumber` for reference continuity.

**AvSight** exports: aircraft, parts, customers in JSON format. AvSight uses GUIDs as primary keys, which map cleanly to `sourceSystemId` fields.

**Generic Excel/CSV**: the mapping editor UI allows an admin to drag-and-drop source columns to target fields and save the mapping as a custom template. This accommodates shops that built their own Access databases or Excel sheets.

### 3.4 Handling 1-to-Many and Many-to-1 Mappings

**1-to-many (one source field → multiple target fields):**
Example: CAMP stores pilot name as "Last, First" in a single column. Athelon needs `firstName` and `lastName` separately. Handle via a `split` transform type with a delimiter and index.

**Many-to-1 (multiple source fields → one target field):**
Example: CAMP stores engine hours and airframe hours in separate columns; Athelon `totalTimeAirframeHours` should come from the airframe column but fall back to engine hours if airframe is empty. Handle via a `coalesce` transform type specifying an ordered list of source columns.

**Nested objects:**
Example: Customer address comes as four separate columns (street, city, state, zip) but Athelon stores a combined `address` string. Handle via a `concat` transform with configurable separator and ordering.

**Relationship resolution:**
Example: CAMP work order rows include a tail number. Athelon work orders need an `aircraftId` (Convex document ID). Handle via a `lookup_entity` transform type that queries `aircraft` by `currentRegistration` at mapping time and substitutes the Convex ID.

---

## 4. Conflict Resolution

### 4.1 Duplicate Detection Strategy

Duplicates arise when the same real-world entity exists in both the source system and Athelon (from prior partial migration, manual entry, or trial period data entry). Detection must happen before any writes.

**Aircraft duplicates** — highest-confidence matching hierarchy:
1. Exact match on `serialNumber` (unique identifier, FAA dataplate) — confidence: 0.99
2. Exact match on `currentRegistration` (N-number, normalized uppercase, no spaces) — confidence: 0.95
3. Exact match on `campAircraftId` when source is CAMP — confidence: 0.98
4. Fuzzy match on (make + model + serialNumber) when serial partially matches — confidence: 0.75

The existing `previewCampAircraftMappings` query in `bulkImport.ts` implements a version of this confidence scoring. The migration engine should generalize this pattern.

**Parts duplicates** — matching hierarchy:
1. Exact match on (`partNumber` + `serialNumber`) for serialized parts — confidence: 0.99
2. Exact match on `partNumber` only for non-serialized parts — confidence: 0.80 (same PN, different qty)
3. Normalized PN match (remove hyphens, uppercase) — confidence: 0.70

**Customer/aircraft owner duplicates** — matching hierarchy:
1. Exact match on normalized email — confidence: 0.95
2. Exact fuzzy match on company name (Levenshtein distance ≤ 2, after stripping LLC/Inc/Corp) — confidence: 0.80
3. Exact match on phone number (E.164 normalized) — confidence: 0.75

**Maintenance record duplicates** — this is the hardest case. Maintenance records must not be duplicated because duplication would falsely extend a compliance record (showing two sign-offs instead of one). Matching criteria:
1. Source system record ID (when preserved in `sourceSystemId` field) — confidence: 0.99
2. (`aircraftId` + `dateOfMaintenance` + `technicianCertificateNumber` + description fuzzy) — confidence: 0.85

### 4.2 Fuzzy Matching Implementation

Convex queries do not support full-text fuzzy search natively. Fuzzy matching during migration conflict detection must happen in Convex actions (Node.js runtime) where string distance libraries are available.

Pattern:
1. A `checkConflicts` internal action fetches all relevant existing records via `ctx.runQuery`.
2. The action applies fuzzy matching in-memory (Node.js, using a library like `fastest-levenshtein`).
3. Results are written to a `conflictReport` document attached to the migration job.
4. The UI queries the conflict report reactively and presents each conflict to the admin.

For large organizations (1,000+ aircraft), load existing records in pages and process in chunks. The action can call `ctx.runMutation` to write conflict report rows incrementally so the UI shows partial progress.

### 4.3 Conflict Resolution UI

The conflict resolution UI presents three outcomes per conflict:

- **Use existing** — discard the incoming row, keep Athelon's existing record
- **Replace** — overwrite existing record with incoming data (risky; requires confirmation; logs full before/after)
- **Create new** — treat as genuinely different entity and import as new record
- **Merge** — field-level merge UI (show both records side by side, let admin pick each field)

For maintenance records and logbook entries, "Replace" and "Create new" must display an additional warning explaining the regulatory implications. Duplicating a maintenance record could produce false compliance evidence. The UI should require an admin attestation checkbox: "I confirm these are distinct maintenance events."

### 4.4 Automated Deduplication Rules

Configurable auto-resolution rules per org reduce the volume of manual review:

```typescript
// migrationDeduplicationRules table
{
  organizationId: v.id("organizations"),
  entityType: v.string(),          // "aircraft", "parts", "customers"
  confidenceThreshold: v.number(), // e.g., 0.95 — auto-resolve above this
  autoResolution: v.union(
    v.literal("use_existing"),
    v.literal("replace"),
    v.literal("create_new"),
    v.literal("manual"),           // always require human review
  ),
  activeForJobTypes: v.array(v.string()),  // which source systems this applies to
}
```

A rule saying "auto-use-existing for aircraft confidence >= 0.98" means any row that exactly matches a serial number is silently skipped without creating a duplicate. This is appropriate for re-running a CAMP import after adding more aircraft — you want to update, not re-create.

---

## 5. Idempotent Migration

### 5.1 Why Idempotency Is Non-Negotiable

A migration that cannot be safely re-run causes serious problems in practice:
- Network timeout during a 500-row batch leaves you with partial data and no way to safely continue
- Customer adds 10 more aircraft in CAMP after the first import — re-running should add the new ones without duplicating the originals
- Bug discovered in a transformation — fix and re-run should produce correct data without manual cleanup

### 5.2 Source System ID as the Idempotency Key

Every source system has a stable identifier per record. CAMP uses `campAircraftId` for aircraft. Corridor uses its work order number. AvSight uses GUIDs.

Athelon schema tables should carry a `sourceSystemId` field (optional string) alongside a `sourceSystem` enum field. The combination `(organizationId, sourceSystem, sourceSystemId)` serves as the idempotency key.

Before inserting a record, the migration loader queries:

```
SELECT * FROM aircraft
WHERE organizationId = $orgId
  AND sourceSystem = "camp"
  AND sourceSystemId = $campAircraftId
LIMIT 1
```

If found: update the record (or skip if unchanged). If not found: insert new.

This requires an index on `(organizationId, sourceSystem, sourceSystemId)` in the schema.

### 5.3 Migration State Tracking

Each row in a batch gets its own state in the `migrationBatchRows` table:

```typescript
{
  jobId: v.id("migrationJobs"),
  batchIndex: v.number(),
  rowIndex: v.number(),
  sourceData: v.string(),           // JSON-encoded original row
  transformedData: v.optional(v.string()),  // post-transform, pre-write
  status: v.union(
    v.literal("pending"),
    v.literal("conflict_pending"),  // waiting for human resolution
    v.literal("skipped_duplicate"),
    v.literal("success"),
    v.literal("error"),
  ),
  resultId: v.optional(v.string()), // Convex ID of created/updated record
  errorMessage: v.optional(v.string()),
  processedAt: v.optional(v.number()),
}
```

When re-running a job, rows with status `success` or `skipped_duplicate` are skipped. Only rows with status `error` or `pending` are reprocessed. This makes re-runs safe and efficient.

### 5.4 Partial Rollback

True rollback of a migration (deleting all imported records) is a distinct feature from idempotent re-runs. Implement it via:

1. The `migrationJobs` table stores every `resultId` created during the job (via the `migrationBatchRows` table).
2. A `rollbackMigrationJob` internal mutation iterates `migrationBatchRows` with status `success`, deletes or archives each created record, and writes a rollback audit log.
3. Rollback is only available within a configurable window (e.g., 30 days) and only for jobs that didn't create records that have since been modified by users.

**The critical guard:** Before rolling back a record, check if any downstream records reference it (e.g., a work order references an imported aircraft). If yes, the record cannot be safely deleted and the rollback must flag it as "blocked." Show a summary of blocked records to the admin and ask if they want to rollback the unblocked subset or abort.

---

## 6. API-Based Migration

### 6.1 Direct API Integration Architecture

File-based migration (CSV upload) is the pragmatic starting point, but direct API integration is the premium path. It enables:
- On-demand incremental sync during the transition period (customer still actively using old system)
- Real-time validation against live source data
- Automated discovery of new records added after initial migration

For Athelon, the most valuable API integrations are:

**CAMP Systems** — has a documented REST API. CAMP is the dominant aircraft tracking system for Part 135 and larger GA operators. Direct CAMP API integration allows pulling aircraft, component times, AD compliance status, and work order history.

**QuickBooks Online** — already referenced in `convex/quickbooks.ts`. Customer billing data migration is partially enabled here.

**Corridor / AvSight** — these competitors have partner API programs for data portability.

### 6.2 OAuth-Based Competitor Import Flow

For any source system with an OAuth2 API:

```
Customer selects "Import from [Competitor]"
  → Athelon redirects to competitor OAuth authorization URL
  → Customer grants read-only access
  → Competitor redirects back with authorization code
  → Convex action exchanges code for access token
  → Token stored (encrypted) in org settings
  → Migration job created with sourceType: "api_oauth"
  → Background action fetches data pages from competitor API
  → Data processed through same pipeline as CSV import
```

In Convex, the OAuth token exchange and API calls happen in Convex actions (Node.js runtime). Actions can make HTTP requests via `fetch`. The token is stored in an encrypted form in the `organizationSettings` table (or a dedicated `migrationCredentials` table with restricted access).

**Token storage pattern:**
```typescript
// Never store raw OAuth tokens in plaintext
// Use Convex environment variables for encryption key
// Encrypt token in action before writing to DB
// Decrypt in action when making API calls
```

### 6.3 Webhook-Driven Incremental Sync

During the transition period (customer running Athelon in parallel with old system), incremental sync keeps Athelon current:

1. Register a webhook on the source system pointing to an Athelon HTTP endpoint.
2. The Convex HTTP router (`convex/http.ts`) receives the webhook POST.
3. The handler validates the webhook signature (HMAC), inserts a `webhookEvent` record, and schedules a `processWebhookEvent` internal mutation.
4. The mutation processes the event as a single-row migration with idempotency checks.

This pattern works for CAMP (which has webhook support for aircraft status changes) and QuickBooks (invoice/payment webhooks).

**Key design decision:** Webhook handlers must be idempotent. Source systems may replay webhooks. Use the source system's event ID as an idempotency key in a `processedWebhookEvents` set.

---

## 7. Audit Trail and Compliance

### 7.1 Data Provenance Fields

Every record created by migration must carry provenance metadata distinguishing it from records created natively. This is both operationally useful and potentially required for FAA audits.

Provenance fields to add to affected tables:

```typescript
// Add to aircraft, parts, customers, workOrders, maintenanceRecords, taskCards
dataOrigin: v.optional(v.union(
  v.literal("native"),           // created directly in Athelon
  v.literal("migration_import"), // created by bulk import job
  v.literal("api_sync"),         // created by API-based sync
  v.literal("migration_manual"), // created by manual data entry during migration
)),
migrationJobId: v.optional(v.id("migrationJobs")),
sourceSystem: v.optional(v.string()),     // "camp", "corridor", etc.
sourceSystemId: v.optional(v.string()),   // ID in source system
sourceImportedAt: v.optional(v.number()), // timestamp of import
sourceValidatedBy: v.optional(v.string()), // userId of person who reviewed/approved import
```

For maintenance records and logbook entries (most sensitive from a regulatory standpoint), two additional fields:

```typescript
originalSignatureDate: v.optional(v.number()),  // date from source system
originalSignatoryName: v.optional(v.string()),  // technician name from source
originalSignatoryCertificate: v.optional(v.string()), // cert number from source
migrationReviewedBy: v.optional(v.string()),    // admin who confirmed accuracy
migrationReviewedAt: v.optional(v.number()),
```

### 7.2 Migration Audit Log

The existing `auditLog` table handles operational changes. Migration needs its own append-only log for the import events themselves:

```typescript
// migrationAuditLog table
{
  organizationId: v.id("organizations"),
  jobId: v.id("migrationJobs"),
  eventType: v.union(
    v.literal("job_created"),
    v.literal("job_started"),
    v.literal("batch_processed"),
    v.literal("conflict_detected"),
    v.literal("conflict_resolved"),
    v.literal("record_created"),
    v.literal("record_updated"),
    v.literal("record_skipped"),
    v.literal("job_completed"),
    v.literal("job_failed"),
    v.literal("job_rolled_back"),
  ),
  actorUserId: v.string(),
  targetTable: v.optional(v.string()),
  targetRecordId: v.optional(v.string()),
  sourceRecordId: v.optional(v.string()),
  detail: v.string(),     // JSON with before/after or error detail
  timestamp: v.number(),
}
```

### 7.3 FAA Compliance for Migrated Records

Under 14 CFR Part 145, the repair station must maintain maintenance records that are accurate, complete, and traceable. When migrating historical maintenance records:

1. **Chain of custody documentation**: The migration job record itself serves as documentation that records were transferred from system X on date Y by admin Z. This should be exportable as a PDF summary for the station's quality system records.

2. **Original signature preservation**: FAA maintenance records must show the original signing technician's name, certificate number, and certificate type. These cannot be fabricated or substituted. Migrated records must carry `originalSignatoryName` and `originalSignatoryCertificate` as read-only display fields, distinct from any Athelon `technicianId` linkage.

3. **Date accuracy**: Maintenance event dates must be exact. When source systems store dates as strings in ambiguous formats (e.g., "1/2/24" could be Jan 2 or Feb 1), the migration mapping must document the assumed format and the admin must explicitly confirm it.

4. **Immutability**: Once a migrated maintenance record is reviewed and approved by the QCM, it should be locked (same `locked: true` flag used for native records). No subsequent edits without a new discrepancy/squawk to document the change.

5. **AD compliance records from CAMP**: When migrating AD compliance status from CAMP, the `migrationAuditLog` should record the CAMP sync timestamp alongside each imported AD status. If an AD has a compliance date in CAMP, that date flows into Athelon's `adCompliance` table as the verified compliance date with `dataOrigin: "migration_import"`.

### 7.4 Customer-Facing Chain of Custody

Aircraft owners (customers) may request copies of all maintenance records for their aircraft (e.g., when selling the aircraft). The chain of custody documentation should show:
- Records created natively in Athelon (with full digital signature trail)
- Records migrated from prior system (with source system identified, migration date, reviewing admin)
- Any gaps or records flagged as incomplete during migration

This can be surfaced via a customer portal report (`/portal/aircraft/:tailId/records`) with origin badges showing "Athelon" vs "[Prior System]" alongside each record.

---

## 8. Multi-Tenant Migration Isolation

### 8.1 Isolation Requirements

A migration job running for Organization A must have zero impact on Organization B. This requires isolation at three levels: data, compute, and scheduling.

**Data isolation** — Every migration table has `organizationId` as the first field and the first index key. All queries use `withIndex("by_organization", ...)`. Convex's document-level security model handles this naturally: mutations validate `organizationId` before every read/write.

**Compute isolation** — Convex serverless functions run independently per invocation. A long-running batch for Org A does not starve Org B. However, a very large migration job (50,000 rows) scheduled via `ctx.scheduler.runAfter` at high frequency can create backpressure if Convex's function scheduler has a per-deployment queue depth limit. Mitigate by using a per-org batch scheduler that enforces a minimum interval between batches.

**Storage isolation** — All files in Convex storage are referenced by `organizationId` in the `files` table. A migration loading documents for Org A writes `organizationId: orgA` on every file metadata record. File URL generation does not enforce org scoping (URLs are opaque storage IDs), so org isolation depends entirely on metadata table access control — ensure all file queries filter by org.

### 8.2 Rate Limiting Per Tenant

Implement a `migrationRateLimits` configuration per org (or a global default policy):

```typescript
{
  organizationId: v.id("organizations"),
  maxConcurrentJobs: v.number(),          // default: 1 (prevent parallel migrations)
  maxBatchesPerMinute: v.number(),        // throttle batch processing rate
  maxFileUploadMb: v.number(),            // cap individual file uploads
  maxRowsPerJob: v.number(),              // cap total rows per job (e.g., 100,000)
  allowedMigrationWindowStart: v.optional(v.number()),  // UTC hour 0-23
  allowedMigrationWindowEnd: v.optional(v.number()),    // UTC hour 0-23
}
```

The `maxConcurrentJobs: 1` default is important. A customer who accidentally submits the same CSV twice should not get two simultaneous imports racing each other on the same data.

**Enforcement pattern in Convex:**

```typescript
// In createMigrationJob mutation
const activeJobs = await ctx.db
  .query("migrationJobs")
  .withIndex("by_organization_status", q =>
    q.eq("organizationId", args.organizationId).eq("status", "loading")
  )
  .collect();

if (activeJobs.length >= rateLimitConfig.maxConcurrentJobs) {
  throw new Error("RATE_LIMIT: Another migration job is already in progress for this organization.");
}
```

### 8.3 Migration Scheduling

For enterprise customers doing a planned cutover (moving from old system to Athelon on a specific date), schedule the migration job to run during off-peak hours:

1. Customer submits job with `scheduledStartAt` timestamp.
2. A Convex scheduled function (`ctx.scheduler.runAt(scheduledStartAt, ...)`) triggers the first batch.
3. The scheduling UI shows estimated completion time based on row count and current batch rate.
4. Customer can cancel before `scheduledStartAt` if they need to make changes to their data.

---

## 9. Testing Migration Pipelines

### 9.1 Test Data Generation

Migration testing requires realistic test data that mimics competitor system exports. Maintain a test fixture library at `apps/athelon-app/tests/fixtures/migration/`:

```
tests/fixtures/migration/
  camp/
    aircraft-export-25-rows.csv
    aircraft-export-1000-rows.csv
    components-export.csv
    ad-status-export.csv
  corridor/
    work-orders-export.csv
    parts-inventory.csv
  generic/
    aircraft-minimal-columns.csv      # missing optional columns
    aircraft-malformed-dates.csv      # MM/DD/YY vs YYYY-MM-DD mix
    aircraft-duplicate-serials.csv    # intentional duplicates for conflict testing
    aircraft-encoding-latin1.csv      # non-UTF-8 encoding
    aircraft-bom-utf8.csv             # UTF-8 with BOM
    aircraft-windows-crlf.csv         # Windows line endings
    parts-unknown-condition-codes.csv # source system condition codes not in Athelon enums
```

Generate test fixtures programmatically so they can be regenerated at any size. A Convex seed script (`convex/seedMigrationTestData.ts`) that exports its own data in a "simulated CAMP format" enables round-trip testing.

### 9.2 Migration Dry-Run Mode

Every migration job should support a dry-run mode. In dry-run:
- All pipeline stages run exactly as in a real run
- No writes are performed (`ctx.db.insert` / `ctx.db.patch` are skipped)
- A complete `dryRunReport` is produced showing exactly what would be created/updated/skipped/errored
- The dry run result is stored and surfaced in the UI before the customer commits to the real run

Dry-run is the migration equivalent of a deployment preview. It gives customers confidence before a destructive operation.

Implementation in Convex:

```typescript
// Pass dryRun: true through the batch processing chain
// Each batch processor checks this flag before writing
// Dry-run results written to migrationDryRunReports table, not to business tables
```

### 9.3 Regression Testing for Migration Transforms

Each field mapping template needs regression tests. When a CAMP export format changes (CAMP occasionally updates their CSV column names between versions), the regression suite catches breakage before a customer hits it.

Test pattern:
```
Given: fixture file at tests/fixtures/migration/camp/aircraft-export-25-rows.csv
When:  apply the CAMP aircraft field mapping template (v1.0)
Then:  produce exactly the expected normalized rows (snapshot test)
```

Store expected outputs as JSON snapshots. When CAMP's format changes, update both the mapping template and the snapshot together, with the change logged in a template changelog.

### 9.4 Customer-Specific Migration Testing

For enterprise onboarding, run a pre-migration validation pass against a sample of the customer's actual data (10-20 rows, scrubbed of PII if needed for staging environments):

1. Customer uploads a 20-row sample CSV.
2. Run validation only (no write stage).
3. Report shows: which rows pass, which fail, what transformations are applied, what conflicts would be detected.
4. Customer reviews the report with their Athelon onboarding contact and corrects data issues in the source system before the full migration.

This "migration rehearsal" process catches format surprises (the customer's CAMP export used a custom date format configured by a contractor 5 years ago) before they affect 10,000 rows.

---

## 10. Migration Monitoring and Observability

### 10.1 Job Status Dashboard

The migration dashboard at `/settings/data-migration` shows:

- **Active jobs**: progress bar, current stage, ETA, error count
- **Completed jobs**: date, source system, rows imported, rows skipped, rows errored, duration
- **Failed jobs**: error summary, retry button, partial results
- **Pending conflict resolution**: count of rows waiting for human review

The dashboard uses `useQuery(api.migrationJobs.listByOrg, { organizationId })` — reactive, no polling needed.

### 10.2 Error Categorization

Migration errors fall into distinct categories. Surface each category separately:

| Category | Examples | Action |
|----------|----------|--------|
| Parse error | Invalid CSV encoding, corrupted file | Admin re-uploads corrected file |
| Validation error | Missing required field, invalid enum value | Admin fixes source data |
| Mapping error | Column name changed in source system | Admin updates field mapping template |
| Conflict error | Duplicate detected requiring human decision | Admin resolves in conflict UI |
| Write error | Convex constraint violation, index conflict | Engineering investigation |
| Timeout error | Batch took too long (unlikely in Convex but possible) | Auto-retry |

Display error counts by category, not just a total error count. "47 validation errors" is actionable. "47 errors" is not.

### 10.3 SLA Monitoring

Define SLAs for migration jobs based on row count:

| Row Count | Expected Duration | Alert Threshold |
|-----------|------------------|-----------------|
| < 100 | < 30 seconds | 2 minutes |
| 100–1,000 | < 5 minutes | 15 minutes |
| 1,000–10,000 | < 30 minutes | 1 hour |
| 10,000–100,000 | < 4 hours | 8 hours |

If a job exceeds its alert threshold, emit a Convex scheduled function that writes a `migrationAlert` event. This can trigger an email or Slack notification to the customer success team.

Track batch processing rate over time: if a job that started at 100 rows/minute is now processing at 10 rows/minute, it has stalled. Detect this via a scheduled "migration watchdog" function that checks in-progress jobs every 5 minutes.

### 10.4 Completion Verification

After a job completes, run a reconciliation check:

1. Count of records claimed to have been created in the job vs. actual records in the target table with that `migrationJobId`.
2. If mismatch, flag the job as `completed_unverified` and alert engineering.
3. Optionally: re-run the parse stage on the original file and compare expected row count to successful row count.

Surface the reconciliation result in the job detail view: "1,247 rows uploaded → 1,244 rows created, 3 rows skipped (duplicate), 0 rows errored."

---

## 11. File and Document Migration

### 11.1 Convex File Storage Architecture for Migration

Athelon uses Convex file storage for all document attachments. The existing pattern in `convex/fileStorage.ts` is:

1. `generateUploadUrl` → client gets a short-lived upload URL
2. Client POSTs file bytes → receives `storageId`
3. `storeFileMetadata` with `storageId` + entity linkage

For migration, step 2 happens server-side (the migration action fetches the file from the source system and POSTs it to Convex storage). This requires a Convex action (not a mutation) because actions can make HTTP requests.

### 11.2 Document Migration Pipeline

```
Source System Has Document
  ↓
migrationAction: fetchAndStoreDocument
  → ctx.runQuery(api.fileStorage.generateUploadUrl)  [get upload URL]
  → fetch(sourceFileUrl)                              [download from source]
  → POST file bytes to Convex upload URL             [store in Convex]
  → ctx.runMutation(api.fileStorage.storeFileMetadata, {
      storageId,
      linkedEntityType: "aircraft" | "workOrder" | "maintenanceRecord",
      linkedEntityId: migratedRecordId,
      migrationJobId: jobId,
      sourceSystem: "camp",
      sourceDocumentId: originalDocId,
      dataOrigin: "migration_import",
    })
```

### 11.3 Document Type-Specific Handling

**Logbook entry scans (JPEG/PNG/PDF):** These are photographic evidence of historical maintenance. They should be linked to the `maintenanceRecords` table via `linkedEntityType: "maintenanceRecord"`. Preserve original filename and source URL in metadata. These cannot be edited — if the scan quality is poor, the original paper document is the authoritative record.

**8130-3 FAA Airworthiness Approval Tags:** Link to specific parts via `linkedEntityType: "part"`. The 8130-3 is a legal document with a specific FAA form number. The migration metadata should capture the original document number from the source system.

**Work order documents:** Link to `workOrders` table. Include the original WO number from the source system in the file metadata description so staff can cross-reference.

**AD compliance backup documentation:** Link to `adCompliance` records. Each AD compliance status should have the supporting documentation (maintenance records, STCs, exemption letters) accessible from the AD detail view.

### 11.4 Large-Scale Document Migration Batching

A Part 135 operator might have 20 years of scanned logbooks — potentially 50,000+ document files. Migrating these files requires:

1. A manifest file listing all documents with their metadata (source URL, linked entity, document type).
2. The migration action processes the manifest in batches of 10 files, downloading and uploading each.
3. A `documentMigrationProgress` table tracks which files are done, failed, or pending.
4. Failed file downloads retry up to 3 times with exponential backoff before being marked as failed.
5. Files unavailable at the source URL are flagged with `status: "source_unavailable"` — the customer must provide these manually later.

**Storage cost estimation:** Convex charges for stored bytes. A 20-year logbook scan archive at ~500KB average per document × 50,000 documents = 25GB. Communicate storage implications to the customer before starting a large document migration.

### 11.5 Document De-duplication

Source systems often store the same document multiple times (attached to multiple work orders, multiple maintenance records). Before uploading:

1. Compute SHA-256 hash of file bytes.
2. Check if a file with that hash already exists in Convex storage for this org (requires a `fileHash` field + index on the `files` table).
3. If found: create new metadata record pointing to existing `storageId`, rather than uploading duplicate bytes.

This content-addressable storage pattern can reduce storage costs significantly for operators who attach the same STC documentation to every work order that uses those parts.

---

## 12. Relational Data Migration

### 12.1 Relationship Models in MRO Source Systems

Source systems vary dramatically in how they model relationships:

**Flat relational (CAMP CSV exports):** Aircraft are standalone rows. Components are rows in a separate file with a foreign key column (`AC_ID`). Work orders are another file with `AC_ID` linking back to aircraft. No nested objects, no join tables — everything is a foreign key.

**Document-embedded (some AvSight exports):** Work orders may embed customer details and aircraft details inline rather than using IDs. Deduplicate these inline objects into first-class entities before linking.

**Hierarchical (Excel workbooks):** One sheet per aircraft, with components in rows below it (no explicit FK — relationship implied by sheet structure and row ordering). Requires custom parsing logic per file.

### 12.2 Migration Order and Dependency Resolution

Relational migration must respect import order. If a work order references an aircraft that hasn't been imported yet, the work order import will fail.

Required import order for Athelon:
1. Organizations (usually already exist — the org is what the customer signed up with)
2. Technicians / staff (needed as actors on maintenance records)
3. Customers (aircraft owners)
4. Aircraft (reference customers)
5. Parts inventory (independent)
6. Work orders (reference aircraft + customers)
7. Task cards (reference work orders)
8. Maintenance records (reference task cards + work orders + technicians)
9. AD compliance records (reference aircraft)
10. Documents / attachments (reference any of the above)

Implement this as a `dependencyGraph` in the migration engine. When a customer uploads multiple files for a complete migration, the engine auto-detects which entities are in each file and schedules jobs in dependency order.

### 12.3 Forward Reference Resolution

Sometimes the dependency graph has circular references or forward references that can't be resolved by ordering alone. For example, a work order might reference an aircraft that was registered under a different tail number at the time of the work order (before an N-number change).

Handle this via a **deferred linkage** pattern:
1. Import all records in dependency order.
2. Records with unresolved references get `pendingLinkage: true` and store the unresolved source ID in a separate field.
3. After all entities are imported, run a `resolvePendingLinkages` pass that attempts to match unresolved references using all available identifiers.
4. Any linkages that cannot be resolved are flagged for manual review in the migration report.

### 12.4 Preserving Source System Relationship IDs

Even after migration, preserve source system relationship identifiers for cross-reference. When a technician receives a call about "CAMP work order WO-2024-1234," they should be able to search Athelon for that original identifier and find the migrated work order.

Add `sourceSystemWONumber` to the work orders table. Index it for search. Surface it in the work order detail view as a "Legacy WO #" field. This is a small schema change with large operational value during the transition period when staff are running both systems.

---

## 13. Timezone, Date, and Unit-of-Measure Normalization

### 13.1 Date Format Diversity

MRO source systems are notorious for inconsistent date formats:

| Source | Common Date Formats |
|--------|---------------------|
| CAMP | MM/DD/YYYY, MM/DD/YY |
| Corridor | YYYY-MM-DD |
| Excel (US locale) | M/D/YY (serial number in some cells!) |
| Excel (EU locale) | DD.MM.YYYY |
| AvSight JSON | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) — the good case |
| Handwritten logbook | Various: "Jan 15, 2019", "15 JAN 19", "1/15/19" |

**Normalization strategy:**
1. All dates stored in Athelon as Unix milliseconds (UTC). This matches the existing schema (`createdAt`, `updatedAt`, etc.).
2. The field mapping template specifies `dateFormat` per column (e.g., `"MM/DD/YYYY"`).
3. The transform stage uses a deterministic date parsing function that requires explicit format — no "auto-detect" that guesses incorrectly.
4. When format is ambiguous (e.g., `01/02/2024` is Jan 2 or Feb 1 depending on locale), the migration UI shows a sample of 5 parsed dates and asks the admin to confirm.
5. Excel date serial numbers (e.g., 45000) are detected by value range and converted using the Excel epoch (January 0, 1900 with the 1900 leap year bug).

### 13.2 Timezone Handling

Aviation maintenance is conducted locally, but records should be stored in UTC.

**The challenge:** CAMP stores times in the repair station's local timezone. If the repair station is in Phoenix (no DST), an event at "14:30" on "03/08/2024" is a different UTC time than it would be if the station were in Chicago.

**Normalization strategy:**
1. The organization's local timezone is set during onboarding (`organizationSettings.timezone` — IANA format, e.g., `"America/Chicago"`).
2. All date-only fields (maintenance dates, inspection dates) are treated as "noon local time on that date" for UTC conversion, which avoids DST boundary issues for date-only fields.
3. All datetime fields are converted using the org's configured timezone unless the source data includes an explicit timezone offset.
4. Historical records from stations in different timezones (e.g., a traveling A&P who logged work in a different state) cannot be corrected retroactively — store as-is with a timezone caveat note.

### 13.3 Hobbs and Tach Time Normalization

Aircraft time is expressed differently across systems:

| Source | Format |
|--------|--------|
| CAMP | Decimal hours (e.g., 4523.7) |
| Some Excel sheets | Hours and tenths as separate columns |
| Hobbs meter | Tenths of hours (raw integer from meter reading) |
| Older records | Hours only (whole number) |
| Some EU systems | Minutes (integer) |

**Normalization strategy:**
- Athelon stores all time values as decimal hours (same as CAMP).
- The field mapping template specifies `timeUnit: "decimal_hours" | "minutes" | "hours_tenths_separate"`.
- Transform functions convert to decimal hours before writing.
- A `timeAccuracyNote` field on aircraft allows recording "time accurate to nearest 0.1 hour as of migration from CAMP on 2026-03-15" for the organization's records.

### 13.4 Units of Measure

MRO data involves several physical unit systems:

| Measurement | Common Variants |
|-------------|-----------------|
| Weight | pounds, kilograms |
| Pressure | PSI, kPa, bar |
| Temperature | Fahrenheit, Celsius |
| Torque | foot-pounds, Newton-meters, inch-pounds |
| Length | inches, millimeters, centimeters |

Athelon schema should standardize on SI or US customary consistently per field. Document the canonical unit per field in a schema annotation. The transform stage converts incoming values to canonical units using a lookup table.

For parts (especially hardware like bolts, O-rings), the part number itself usually implies the unit system (AN hardware is imperial, ISO hardware is metric). The migration engine should not silently convert part numbers but should flag imported parts with metric-standard part numbers for review if the org typically works with AN/MS hardware.

---

## 14. Convex-Specific Implementation Patterns

### 14.1 Function File Organization

The migration subsystem should live in its own Convex function files, separate from business logic:

```
convex/
  migration/
    migrationJobs.ts          # CRUD for migration job lifecycle
    migrationBatches.ts       # Batch processing internal mutations
    migrationConflicts.ts     # Conflict detection and resolution
    migrationFieldMaps.ts     # Field mapping template CRUD
    migrationDocuments.ts     # Document/file migration actions
    migrationWatchdog.ts      # Scheduled monitoring functions
    migrationRollback.ts      # Rollback internal mutations
  lib/
    migrationHelpers.ts       # Shared transform functions
    migrationConstants.ts     # Enum maps, competitor field names
```

### 14.2 Using Convex Actions for Heavy Processing

Convex mutations run in a transaction and cannot make HTTP requests. For migration stages that require I/O (fetching files, calling competitor APIs, running fuzzy string matching on large datasets), use Convex actions:

```typescript
// convex/migration/migrationDocuments.ts
"use node";  // Required for Node.js APIs (crypto, Buffer)

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const fetchAndStoreDocument = internalAction({
  args: {
    jobId: v.id("migrationJobs"),
    sourceUrl: v.string(),
    linkedEntityType: v.string(),
    linkedEntityId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Download file from source system
    const response = await fetch(args.sourceUrl);
    if (!response.ok) {
      await ctx.runMutation(internal.migration.migrationBatches.recordDocumentError, {
        jobId: args.jobId,
        sourceUrl: args.sourceUrl,
        error: `HTTP ${response.status}`,
      });
      return;
    }

    // Upload to Convex storage
    const blob = await response.blob();
    const uploadUrl = await ctx.runMutation(internal.fileStorage.generateUploadUrl, {});
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: blob,
    });
    const { storageId } = await uploadResponse.json();

    // Store metadata
    await ctx.runMutation(internal.fileStorage.storeFileMetadata, {
      storageId,
      fileName: args.sourceUrl.split("/").pop() ?? "migrated-document",
      mimeType: response.headers.get("content-type") ?? "application/octet-stream",
      fileSize: blob.size,
      organizationId: args.organizationId,
      linkedEntityType: args.linkedEntityType,
      linkedEntityId: args.linkedEntityId,
    });
  },
});
```

### 14.3 Scheduler Chaining for Long-Running Batches

The self-scheduling pattern for batch processing:

```typescript
// convex/migration/migrationBatches.ts

export const processBatch = internalMutation({
  args: {
    jobId: v.id("migrationJobs"),
    batchOffset: v.number(),
    batchSize: v.number(),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "cancelled") return;

    // Fetch next N rows
    const rows = await ctx.db
      .query("migrationBatchRows")
      .withIndex("by_job_offset", q =>
        q.eq("jobId", args.jobId)
         .gte("rowIndex", args.batchOffset)
      )
      .take(args.batchSize);

    // Process rows
    let successCount = 0;
    for (const row of rows) {
      try {
        if (!args.dryRun) {
          await processRow(ctx, job, row);
        }
        await ctx.db.patch(row._id, { status: "success", processedAt: Date.now() });
        successCount++;
      } catch (e) {
        await ctx.db.patch(row._id, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Unknown error",
          processedAt: Date.now(),
        });
      }
    }

    // Update job progress
    await ctx.db.patch(args.jobId, {
      processedRows: job.processedRows + rows.length,
      successRows: job.successRows + successCount,
    });

    // Schedule next batch if more rows remain
    if (rows.length === args.batchSize) {
      await ctx.scheduler.runAfter(0, internal.migration.migrationBatches.processBatch, {
        jobId: args.jobId,
        batchOffset: args.batchOffset + args.batchSize,
        batchSize: args.batchSize,
        dryRun: args.dryRun,
      });
    } else {
      // All done
      await ctx.db.patch(args.jobId, {
        status: job.errorRows > 0 ? "completed_with_errors" : "completed",
        completedAt: Date.now(),
      });
    }
  },
});
```

### 14.4 Indexes Required for Migration

Add to `schema.ts`:

```typescript
// migrationJobs table
.index("by_organization", ["organizationId"])
.index("by_organization_status", ["organizationId", "status"])

// migrationBatchRows table
.index("by_job", ["jobId"])
.index("by_job_offset", ["jobId", "rowIndex"])
.index("by_job_status", ["jobId", "status"])

// migrationAuditLog table
.index("by_job", ["jobId"])
.index("by_organization", ["organizationId"])

// files table (add for document dedup)
.index("by_org_hash", ["organizationId", "fileHash"])

// For idempotency on business tables, add to aircraft, parts, customers, etc.:
.index("by_org_source", ["organizationId", "sourceSystem", "sourceSystemId"])
```

### 14.5 Schema Addition for Provenance Fields

For existing tables that will receive migrated data, add provenance fields via the schema change process (with Marcus Webb regulatory review for `maintenanceRecords` and `adCompliance` tables, per the schema change protocol in `schema.ts`):

```typescript
// Patch to add to aircraft, parts, customers tables:
dataOrigin: v.optional(v.union(
  v.literal("native"),
  v.literal("migration_import"),
  v.literal("api_sync"),
)),
migrationJobId: v.optional(v.id("migrationJobs")),
sourceSystem: v.optional(v.string()),
sourceSystemId: v.optional(v.string()),
sourceImportedAt: v.optional(v.number()),
```

Because these are all optional fields with no index requirements for existing functionality, they can be added without schema migration (Convex handles optional field additions gracefully).

---

## 15. Recommendations and Implementation Roadmap

### 15.1 Phase 1 — Foundation (Weeks 1–4)

**Goal:** Reliable, observable CSV import for the three core entity types (aircraft, parts, customers) with full audit trail and dry-run capability.

Deliverables:
- Schema: `migrationJobs`, `migrationBatchRows`, `migrationAuditLog`, `migrationFieldMappingTemplates` tables
- Backend: `convex/migration/migrationJobs.ts`, `migrationBatches.ts`, `migrationFieldMaps.ts`
- Provenance fields added to `aircraft`, `parts`, `customers` tables
- Dry-run mode on all three import types
- Job status UI at `/settings/data-migration`
- CAMP and generic CSV field mapping templates (prebuilt)
- Error categorization and per-row error reporting
- Auto-rollback (within 24 hours, unmodified records only)

**What this enables:** Every new customer can onboard their fleet, parts inventory, and customer list without manual data entry. Eliminates the #1 friction point in the trial-to-paid conversion.

### 15.2 Phase 2 — Conflict Resolution and Document Migration (Weeks 5–8)

**Goal:** Handle duplicate detection gracefully, enable historical document migration.

Deliverables:
- `migrationConflicts.ts` with fuzzy matching engine
- Conflict resolution UI (side-by-side merge view)
- Auto-deduplication rules configuration
- Document/attachment migration pipeline (Convex action + batch scheduler)
- File hash deduplication
- 8130-3 and logbook scan migration with proper entity linkage
- Source system ID preservation across all imported entities

### 15.3 Phase 3 — Relational Data and Maintenance Records (Weeks 9–14)

**Goal:** Full historical migration including work orders, task cards, and maintenance records.

Deliverables:
- Dependency-ordered multi-file migration (aircraft before WOs before maintenance records)
- Deferred linkage resolution pass
- Maintenance record migration with original signature preservation
- Chain of custody PDF export (for QC binder)
- `sourceSystemWONumber` searchable field on work orders
- AD compliance migration from CAMP with supporting document linkage

**Regulatory gating:** This phase requires explicit sign-off from the regulatory reviewer (Marcus Webb equivalent) before production deployment. Migrated maintenance records must not be indistinguishable from natively-signed records — the data origin display must be surfaced in every view of a migrated maintenance record.

### 15.4 Phase 4 — API Integration and Incremental Sync (Weeks 15–20)

**Goal:** Premium migration path for enterprise customers with live API connections.

Deliverables:
- CAMP Systems REST API integration (OAuth + direct pull)
- Webhook endpoint for incremental sync during transition period
- QuickBooks customer/billing data migration (extends existing `convex/quickbooks.ts`)
- Migration scheduling (run at off-peak hours)
- SLA monitoring and alerting
- Migration metrics dashboard for internal customer success team

### 15.5 Key Design Decisions Summary

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Migration isolation from business logic | Separate `convex/migration/*.ts` files | Different invariants, different error handling, different metadata |
| Source of truth for progress | Convex `migrationJobs` table | Reactive queries eliminate polling |
| Idempotency key | `(orgId, sourceSystem, sourceSystemId)` | Enables safe re-runs |
| Fuzzy matching location | Convex actions (Node.js) | Requires string distance libraries unavailable in query handlers |
| Batch size | 20–100 rows, configurable per entity type | Balance between throughput and mutation time limits |
| File deduplication | SHA-256 content hash | Storage cost + prevents redundant uploads |
| Date handling | Explicit format in mapping template, no auto-detect | Prevents silent incorrect conversions |
| Rollback window | 24–72 hours, unmodified records only | Balances safety with operational reality |
| Maintenance record origin | Always displayed, cannot be hidden | Regulatory requirement for traceability |
| Concurrent jobs | Max 1 per org (configurable) | Prevents race conditions on same dataset |

---

*This document is part of the Athelon data migration research corpus. Related documents: 01-competitive-landscape.md (competitor systems to integrate), 02-customer-migration-journeys.md (user research on migration pain points), 03-migration-product-requirements.md (feature requirements and prioritization).*
