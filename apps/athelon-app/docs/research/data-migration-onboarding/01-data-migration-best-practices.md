# B2B SaaS Data Migration Best Practices
## Research Document — Athelon MRO Platform

**Date:** 2026-03-12
**Scope:** Comprehensive analysis of B2B SaaS data migration strategies, with MRO-specific (FAA Part 145) considerations for the Athelon platform.

---

## Table of Contents

1. [Migration Architecture Patterns](#1-migration-architecture-patterns)
2. [Data Mapping & Transformation](#2-data-mapping--transformation)
3. [Data Validation & Integrity](#3-data-validation--integrity)
4. [Migration Tooling](#4-migration-tooling)
5. [Risk Management](#5-risk-management)
6. [Performance & Scale](#6-performance--scale)
7. [Post-Migration](#7-post-migration)
8. [Case Studies](#8-case-studies)
9. [MRO-Specific Considerations](#9-mro-specific-considerations)
10. [Key Takeaways](#10-key-takeaways)

---

## 1. Migration Architecture Patterns

### 1.1 ETL Pipelines (Extract, Transform, Load)

ETL is the foundational pattern for B2B SaaS migrations. The three stages operate independently, allowing each to be optimized, monitored, and replayed in isolation.

**Extract**
- Pull source data via API, direct database connection, CSV export, or a combination
- Capture a point-in-time snapshot OR stream changes incrementally (CDC — Change Data Capture)
- Store extracted raw data in a staging area before any transformation begins; this preserves the original state for rollback and audit
- Tools: AWS Glue, Apache Airflow, Fivetran, Stitch, dbt for transformation layer

**Transform**
- Apply field-level mapping rules (see Section 2)
- Normalize character encodings (UTF-8 canonicalization is commonly missed)
- Convert date formats and timezone representations
- Resolve lookup/reference table mismatches
- Generate surrogate keys if source system uses natural keys that conflict with target schema

**Load**
- Bulk inserts (COPY commands in Postgres, batchWrite in DynamoDB) outperform row-by-row inserts by 10–100x for large datasets
- Use idempotent upsert operations so the load step can be safely retried without duplicates
- Disable non-critical indexes during bulk load, rebuild afterward for performance
- Write audit log entries (who loaded what, when, record count, checksum) alongside the data

**ELT variant (Extract, Load, Transform)**
- Load raw data first into the target or a staging schema, then transform in-place using the target database's compute
- Common with cloud data warehouses (BigQuery, Snowflake, Redshift) where storage is cheap and compute is elastic
- Preferred when transformation logic is complex and benefits from SQL window functions or target-system-native features

### 1.2 Staged Migration

Staged migration moves data in discrete phases rather than all at once. This reduces blast radius and allows partial validation before proceeding.

**Typical stage structure:**
1. **Historical archive data** — low-risk, read-only, no operational dependency
2. **Reference/master data** — customers, aircraft registrations, parts catalog, vendors; foundational for relational integrity in subsequent stages
3. **Transactional records** — work orders, invoices, maintenance logs; depend on master data being in place
4. **Active/in-flight records** — open work orders, current discrepancies, pending tasks; migrated last, closest to cutover
5. **User accounts and preferences** — migrated with or after active records; requires SSO or credential re-establishment

**MRO-specific staging order:**
1. Aircraft registry (N-numbers, make/model/serial, ATC registrations)
2. Customer and operator records
3. Parts catalog and inventory positions
4. Vendor and supplier records
5. Closed/historical work orders and maintenance logs (FAA 43.9 records)
6. AD/SB compliance history per aircraft
7. Open work orders and active discrepancies
8. User accounts, role assignments, and digital signature authorizations

### 1.3 Shadow / Parallel Running

Shadow running (also called parallel running or dual-write) is the safest migration pattern for high-availability systems. Both the source system and the target system operate simultaneously for a period before final cutover.

**Approaches:**
- **Dual-write:** All writes go to both source and target. Reads continue from source. After validation period, reads switch to target.
- **Shadow reads:** Target system processes the same queries independently; results are compared but target responses are discarded. Divergence alerts trigger investigation.
- **Event replay:** Capture all source system events in a queue (Kafka, SQS) and replay them against the target to keep it in sync.

**Advantages:**
- Zero-downtime cutover is achievable
- Real-world data patterns expose edge cases that synthetic tests miss
- Rollback is trivial (stop writing to target, continue with source)

**Disadvantages:**
- Operational complexity doubles during the parallel period
- Write amplification increases costs
- State divergence must be actively reconciled; silent divergence is the primary failure mode
- Duration is typically 2–8 weeks for B2B SaaS; longer for heavily regulated systems

**Shadow running in MRO context:**
FAA Part 145 certificated repair stations cannot have airworthiness records in a disputed state. Shadow running is appropriate for non-regulatory data (customer profiles, billing) but the maintenance record migration must be treated as a cutover event with a clear audit trail showing when each record's authoritative home changed systems.

### 1.4 Big-Bang vs. Phased Cutover

**Big-Bang Cutover**
- All data moves at once during a planned maintenance window
- Source system goes read-only or offline at T-minus cutover
- Target system goes live when validation passes
- Simpler to reason about; no dual-system complexity
- Higher risk: if validation fails at 3 AM, the window may not be large enough to roll back and retry

Appropriate for:
- Small datasets (< 100K records total)
- Customers with low ongoing transaction volume
- Systems where the cost of parallel running exceeds the risk

**Phased Cutover**
- Modules or data domains cut over incrementally
- E.g., billing data migrates in week 1, work orders in week 2, fleet records in week 3
- Users operate across both systems simultaneously during transition
- Requires clear feature flagging and routing logic in the application layer

Appropriate for:
- Large, complex datasets
- Long-tail customer migrations (migrating 500 customers one at a time)
- When the business cannot tolerate a full-system maintenance window

**Industry practice:**
HubSpot's Professional Services team typically runs a phased approach: CRM contacts migrate first (can be done while the account is live in legacy), then deal pipeline, then activity history (which is often the most voluminous and most lossy). They accept that activity history before a certain date becomes read-only archive data.

### 1.5 Rollback Strategies

Every migration plan must define rollback criteria and procedures before the migration begins.

**Types of rollback:**
- **Full rollback:** Return to source system entirely; target data is discarded. Requires source system to have remained authoritative (no dual-write period ended).
- **Partial rollback:** Roll back a specific data domain while keeping others migrated.
- **Point-in-time restore:** Restore target to a known-good snapshot taken at a specific migration step.

**Rollback prerequisites:**
- Source system must be kept in a read-only (not decommissioned) state until rollback window closes
- All ETL steps must be logged with enough detail to understand what changed
- Rollback decision authority must be defined in advance (who has sign-off, what thresholds trigger it)
- Rollback SLA must be defined: how long to restore vs. continue troubleshooting

**Rollback window recommendations:**
- **High-risk migrations (regulated data, large datasets):** 30-day rollback window with source kept live
- **Medium-risk:** 14-day window, source kept read-only
- **Low-risk:** 7-day window, source kept for export only

**MRO-specific rollback consideration:**
FAA maintenance records (FAA Form 337, 8130-3 releases, 43.9 entries) have legal standing. If a migration results in record corruption, the rollback is not merely a technical restore — it may require regulatory notification. Source system preservation for the full rollback window is non-negotiable for these record types.

---

## 2. Data Mapping & Transformation

### 2.1 Schema Mapping Between Competitor Systems

No two MRO software vendors use the same schema. Common source systems for MRO migrations include:

- **CAMP Systems** — aviation maintenance tracking; strong AD/SB tracking, inspection program data
- **AircraftLogs** — general aviation logbook SaaS
- **AvTrak** — maintenance tracking, parts management
- **ATP** (formerly Aviall Services Software) — large commercial MRO tools
- **Corridor** — comprehensive MRO ERP
- **Quantum MX** — modern MRO SaaS; data model is closest to Athelon
- **Traxxall** — maintenance scheduling and tracking

**Schema mapping process:**

1. **Source schema discovery** — export schema documentation from source system; if unavailable, reverse-engineer from CSV exports or API responses
2. **Field catalog** — enumerate every field in the source export with data type, nullability, and example values
3. **Target schema map** — for each source field, identify the target field, transformation rule, and handling for missing/null values
4. **Unmapped source fields** — explicitly decide: drop, store as extended attributes, or create new target fields
5. **Unmapped target fields** — identify what will be null/default in migrated records vs. fields that must be populated from derived logic

**Field mapping document format (recommended):**

| Source Field | Source Type | Target Field | Target Type | Transform Rule | If Null |
|---|---|---|---|---|---|
| `aircraft_registration` | string | `tailNumber` | string | uppercase, strip spaces | reject record |
| `last_annual_date` | MM/DD/YYYY string | `lastAnnualCompletedAt` | Unix timestamp ms | parse with moment.js | null (allowed) |
| `squawk_text` | string (4000 char) | `description` | string (unlimited) | passthrough | empty string |
| `status_code` | enum (1-9) | `status` | enum string | lookup table (see below) | `unknown` |

### 2.2 Field-Level Transformation Rules

**Date/time normalization**
- Identify source timezone assumptions (many legacy systems store timestamps in local time with no TZ marker)
- Convert all timestamps to UTC for storage; apply display-layer timezone conversion
- Handle ambiguous dates during DST transitions: source system may have 1:30 AM twice on a given date

**Enum/status mapping**
Source systems frequently use numeric codes, single-character codes, or non-standard strings for status values. Explicit lookup tables are required.

Example: Work Order Status Mapping
```
Source (Corridor)    → Target (Athelon)
"OPEN"               → "open"
"IN_PROGRESS"        → "in_progress"
"PENDING_PARTS"      → "waiting_parts"
"QC_HOLD"            → "inspection_hold"
"CLOSED"             → "closed"
"INVOICED"           → "invoiced"
"CANCELLED"          → "cancelled"
"DEFER"              → "deferred"   // Athelon-specific: map from source
"SCRAPPED"           → "cancelled"  // Lossy: nuance lost, document in migration log
```

**Text field cleaning**
- Strip control characters and null bytes from legacy database exports (common in pre-2010 systems)
- Normalize line endings (CRLF → LF)
- Handle character encoding issues: Latin-1 → UTF-8 conversion, special characters in technician names
- Truncate fields that exceed target maximum length; log all truncations as warnings

**Numeric normalization**
- Part numbers: strip leading/trailing whitespace, case normalization (some systems uppercase, some lowercase)
- Currency: identify source currency and store with explicit currency code; do not assume USD
- Weights and measurements: identify unit systems (imperial vs. metric) at source; convert to Athelon's canonical units

**Identity resolution**
Duplicate records are common in source systems. Before migration:
- Deduplicate customer/operator records by matching on EIN, ICAO code, or canonical address
- Deduplicate aircraft records by N-number (for US-registered) or ICAO registration; cross-reference FAA registry
- Deduplicate parts by P/N + manufacturer combination; create a merge map for aliases
- Document all merges in the migration log with original source IDs preserved

### 2.3 Handling Data Model Mismatches

**Structural mismatches (flattening/nesting):**
- Source system may store work order + all line items as a flat CSV row; target has normalized WO header + child line items
- Source system may have deeply nested XML/JSON; target is a relational schema
- Transform scripts must handle both decomposition (split one source record into parent + children) and composition (merge multiple source records into one target record)

**Cardinality mismatches:**
- Source allows one technician per work order; target supports many-to-many technician assignments
- Migrate single technician as the primary assigned technician; note in migration documentation that historical WOs may not reflect full crew

**Missing concepts:**
- Athelon's RBAC model (8 roles) may not have a direct equivalent in the source system
- Map source permission levels to Athelon roles using the principle of least privilege
- Flag accounts that had admin-equivalent access in source but will receive restricted roles in Athelon; require customer confirmation before cutover

**Soft delete vs. hard delete:**
- Source system may have permanently deleted records; they will be absent from the export
- Source system may use soft deletes (is_deleted flag) — migrate these as archived/cancelled records with a note in the migration log, not as fully deleted records
- Athelon's audit trail requires records to be preserved; never hard-delete migrated records

### 2.4 Lossy vs. Lossless Migration Tradeoffs

**Lossless migration:** Every bit of source data is preserved in the target, either in mapped fields or in a structured archive field. Zero information is discarded.

- Recommended for: FAA-regulated maintenance records, airworthiness release data, discrepancy histories
- Implementation: store unmappable source fields in a JSON `legacyData` field on each record; surface via a "Legacy Data" panel in the UI for customer review
- Cost: higher storage, longer migration time, more complex ETL

**Lossy migration:** Some source data is intentionally discarded because it has no equivalent in the target or is not valuable enough to migrate.

Common acceptable losses:
- UI preferences and layout customizations
- Internal system metadata (record creator IDs that don't correspond to target users)
- Duplicate/superseded records that were already inactive
- Free-form notes fields from before a defined historical cutoff date

**Never acceptable losses in MRO context:**
- Any FAA Form 337 major repair/alteration records
- 8130-3 airworthiness approval tag data
- Return-to-service sign-offs with technician identity
- AD compliance status changes with effective dates
- Any record that could be subpoenaed in an incident investigation

**Customer acknowledgment:**
For any lossy migration, require explicit written customer sign-off on a migration scope document that lists exactly what will not be migrated and why. Store this document in the customer's account audit trail.

---

## 3. Data Validation & Integrity

### 3.1 Pre-Migration Audits

Before any data moves, conduct a thorough audit of the source data.

**Source data quality assessment:**
- Row counts per table/entity type
- Null rates for required fields
- Distribution analysis for enum fields (catch unexpected values)
- Duplicate analysis (exact duplicates, near-duplicates by key identifier)
- Date range analysis (catch obviously wrong dates: records dated in 1900, future-dated records)
- Referential integrity check (orphaned child records with no parent)
- Character encoding scan (identify non-UTF-8 characters)

**Data quality scoring:**
Assign a quality score per entity type (0–100). Score below 70 triggers a data quality remediation step before migration proceeds. Common remediations:
- Customer fills in missing required fields in source system before export
- Athelon team performs deduplication on customer's behalf
- Agreement to migrate only records meeting minimum quality threshold; rest go to a "needs review" quarantine

**Audit report format:**
Deliver a pre-migration audit report to the customer with:
- Summary counts by entity type
- Data quality score per entity type
- List of records that will fail validation and require remediation
- Estimated migration completion time based on record volume
- Explicit list of fields that cannot be migrated and why

### 3.2 Checksum Verification

Checksums verify that data was not corrupted in transit or during transformation.

**Implementation pattern:**
1. At extract time, compute a checksum over each record (SHA-256 of the canonical JSON representation of the row)
2. Store checksums in a migration manifest alongside the raw extracted data
3. After load, recompute checksums from the target database
4. Compare manifests: any mismatch is a corruption event requiring investigation
5. Report: total records, matched checksums, mismatched checksums, missing records, unexpected records

**Aggregate checksums:**
In addition to per-record checksums, compute aggregate checksums:
- Total record count per entity type
- Sum of numeric fields (e.g., total hours flown, total invoice value) as a sanity check
- Hash of the ordered set of all primary keys per table

**Incremental checksum for delta syncs:**
For ongoing delta sync after initial migration, maintain a high-watermark timestamp. Compute checksums only over records modified after the last sync. Compare against target to detect sync gaps.

### 3.3 Row-Count Reconciliation

Row-count reconciliation is the simplest and fastest sanity check.

**Reconciliation levels:**
- **Level 1:** Total row count source vs. target (by entity type)
- **Level 2:** Row count by status/category breakdown (open WOs, closed WOs, etc.)
- **Level 3:** Row count by customer/aircraft (for multi-tenant systems)
- **Level 4:** Row count by date range bands (last 30 days, last year, 1–5 years ago, > 5 years)

**Acceptable thresholds:**
- Level 1: 100% match required (no tolerance for missing records)
- Level 2–4: 100% match required unless customer has explicitly acknowledged specific exclusions

**Automated reconciliation script:**
Run reconciliation scripts at each stage of a staged migration, not just at the end. A discrepancy found at stage 2 is far cheaper to fix than one found after all 5 stages have completed.

### 3.4 Referential Integrity Checks

After load, verify that all foreign key relationships are satisfied.

**Critical relationships in Athelon schema:**
- Every `workOrder` must reference a valid `aircraft` (by `_id` or `tailNumber`)
- Every `workOrder` must reference a valid `customer` (by `_id`)
- Every `discrepancy` must reference a valid `workOrder`
- Every `taskCard` must reference a valid `workOrder`
- Every `taskCardVendorService` must reference a valid `taskCard` and valid `vendor`
- Every `document` must reference a valid `workOrder` or `taskCard`
- Every `adCompliance` record must reference a valid `aircraft`

**Orphan detection queries:**
Write SQL or Convex query equivalents for each relationship. Any orphaned child record is a migration defect. Resolution options: re-link to correct parent (if parent exists with different key), quarantine in a "needs review" table, or reject and report to customer for manual resolution.

**Circular reference detection:**
Some legacy systems have circular references (e.g., a work order that depends on itself). These must be detected and broken during transformation with explicit documentation of how they were resolved.

### 3.5 Automated Validation Suites

Build a migration validation suite that runs automatically at each stage.

**Validation suite components:**
- **Schema validation:** Every migrated record passes JSON Schema or Zod validation against the target schema
- **Business rule validation:** Domain-specific rules (e.g., a closed work order must have a completion date, a released aircraft must have a technician sign-off)
- **Referential integrity validation:** All FK relationships satisfied (see 3.4)
- **Checksum validation:** Per-record and aggregate (see 3.2)
- **Row count reconciliation:** (see 3.3)
- **Sample spot-check:** Random sample of N records (configurable) with human-readable comparison of source vs. target values

**Validation report output:**
- Pass/fail per validation category
- Detailed failure list with source record ID, field name, expected value, actual value
- Summary metrics: total records, passed, failed, failure rate
- Recommendation: proceed, remediate-and-retry, or escalate

**Continuous validation in shadow/parallel running:**
During shadow running, run the validation suite on a schedule (hourly or daily). Alert on any new divergence between source and target. Track divergence trends — a growing divergence count indicates a systematic sync gap, not a one-off data issue.

---

## 4. Migration Tooling

### 4.1 Self-Service Import Wizards

Self-service import tools put migration control in the customer's hands. They are cost-effective for high-volume, low-complexity migrations.

**Design principles:**
- **Progressive disclosure:** Start with a simple upload screen; reveal complexity only as needed
- **Immediate feedback:** Validate and preview results before committing
- **Clear error messages:** "Column 'tail_number' is required but was not found" is better than "Import failed"
- **Undo / rollback:** Allow the customer to delete an import batch and try again
- **Mapping UI:** Let customers map their source columns to target fields via a drag-and-drop or dropdown interface; pre-populate likely mappings using fuzzy column name matching

**Recommended UI flow for Athelon self-service importer:**
1. Download a template CSV (per entity type: aircraft, customers, work orders)
2. Upload filled-in CSV
3. Auto-detect column mappings (with customer override)
4. Preview first 20 rows of transformed data
5. Run validation; show pass/fail with drill-down on failures
6. Customer fixes source data and re-uploads OR accepts import with acknowledged skips
7. Confirm and commit
8. Download import report (records imported, skipped, errors)

**Supported entity types for self-service import (recommended):**
- Aircraft (tail numbers, make/model/serial, engine details)
- Customers / operators
- Contacts
- Parts catalog entries
- Vendors / suppliers

**Entity types requiring white-glove (not self-service):**
- Historical work orders (complex relational structure, regulatory implications)
- AD compliance history (FAA record integrity requirements)
- Maintenance log entries (require technician identity preservation)

### 4.2 White-Glove Migration Services

For complex, high-stakes migrations, a professional services-led approach is warranted.

**Process:**
1. **Discovery call** — understand source system(s), record volumes, data quality concerns, desired go-live date
2. **Migration scoping document** — define exactly what will and will not be migrated; customer signs off
3. **Source data export** — customer exports data from source system (CSV, database dump, API export); Athelon receives via secure transfer (SFTP, encrypted S3 presigned URL)
4. **Data quality audit** — automated audit + manual review; findings reported to customer
5. **ETL script development** — custom transformation scripts written for the source system
6. **Test migration** — migrate data into a staging environment; customer validates
7. **Remediation round(s)** — customer fixes data issues; re-run test migration
8. **Production migration** — migrate to production during agreed maintenance window
9. **Customer sign-off** — customer validates production data; signs migration acceptance document
10. **Source system sunset** — per agreed timeline, customer decommissions source system

**Pricing models:**
- Flat fee per migration project (common for SMB; ~$2,000–$10,000)
- Per-record pricing for large data volumes (common for enterprise; $0.001–$0.01 per record)
- Included in annual contract for enterprise tier customers (HubSpot, Salesforce model)

### 4.3 CSV / API / Database-Level Migration Approaches

**CSV approach:**
- Pros: Universal, no source system API access required, customer has full control over export
- Cons: No incremental sync, large exports can be slow, no type information (everything is a string)
- Best for: Initial one-time migration, smaller datasets (< 500K rows), customers who cannot provide API access

**API approach:**
- Pros: Real-time incremental sync possible, structured typed data, supports delta migrations
- Cons: Rate limits, API key management, source system API changes can break migration
- Best for: Delta sync during shadow running period, migrations from modern SaaS systems with stable APIs
- Example: Migrating from Quantum MX (if they expose an API) or CAMP Systems
- Rate limit handling: implement exponential backoff, track rate limit headers, pause and resume, estimate total migration time based on rate limit

**Database-level approach:**
- Pros: Fastest for large datasets, no application-layer overhead, direct schema access
- Cons: Requires database access credentials (security concern), source schema may be undocumented
- Best for: Enterprise migrations where the customer controls their own on-premise MRO software (e.g., Corridor on-premise installation)
- Tools: pg_dump/restore, mysqldump, AWS Database Migration Service (DMS), Google DataStream

### 4.4 Migration Middleware

Migration middleware sits between source and target, handling transformation, queuing, and retry logic.

**Purpose-built migration platforms:**
- **Airbyte** (open source) — connectors for 300+ sources; custom connector SDK available
- **Fivetran** — managed ETL; expensive but reliable; strong CDC support
- **Stitch** — simpler than Fivetran; good for smaller data volumes
- **AWS Glue** — serverless ETL; tight AWS integration
- **dbt** — transformation layer; works on top of data already in a staging database

**Custom middleware (recommended for Athelon):**
For MRO migrations, the domain complexity and regulatory requirements justify building a lightweight custom migration pipeline rather than using a generic tool. A Node.js/TypeScript pipeline that:
- Reads source CSVs or API endpoints
- Applies domain-specific transformation rules (with a transformation rule registry per source system)
- Validates against Zod schemas that mirror the Convex schema
- Loads via Convex mutations (respecting rate limits)
- Logs every step to an immutable audit log

This approach gives Athelon full control over transformation rules, validation logic, and audit trail format.

---

## 5. Risk Management

### 5.1 Data Loss Prevention

**Backup-before-migrate rule:**
Always take a full backup of the target environment before beginning any migration load step. This applies even to test migrations in staging.

**Append-only staging:**
Write all migrated records to a staging table/collection before moving to production. Review staging before committing to production. If anything goes wrong in production, the staging data can be used to restore without re-running the ETL.

**Write receipts:**
For every record written to the target, capture and store the Convex document ID returned by the insert. This receipt log allows point-in-time reconstruction of exactly what was inserted during the migration batch.

**Partial failure handling:**
Migration batches will occasionally fail mid-batch. Idempotent upsert operations ensure that re-running a failed batch doesn't create duplicates. Use a deterministic ID generation strategy (e.g., hash of source system + source record ID) so the same source record always produces the same target ID.

### 5.2 PII and Compliance During Migration

**PII categories in MRO data:**
- Technician names and certificate numbers (FAA mechanic certificate numbers, A&P numbers)
- Customer names, contact information, billing data
- Aircraft owner information (N-number registration lookup reveals owner name and address for US-registered aircraft)
- Operator employee records (if the repair station performs corporate flight department maintenance)

**Data handling requirements:**
- PII must be encrypted in transit (TLS 1.2+ for all data transfer)
- PII must be encrypted at rest in staging storage (S3 SSE-KMS or equivalent)
- Staging data must be purged after migration is complete (30-day retention maximum)
- If migration is performed by a third party (professional services vendor), a DPA (Data Processing Agreement) must be in place before any data transfer
- GDPR considerations: if the customer has EU-based operators or personnel, data cannot transit through non-GDPR-compliant infrastructure

**FAA regulatory compliance:**
- FAA 14 CFR Part 43 Appendix B requires maintenance records to be legible and maintained for specific periods (until aircraft is scrapped or transferred for general aviation aircraft)
- Records transferred via migration must maintain authenticity — the migrated record must document that it was migrated and from what source system
- A migration does not constitute a "new" maintenance entry; the original date, technician, and sign-off are preserved, with migration metadata appended separately

**HIPAA note:**
MRO data generally does not trigger HIPAA, but corporate flight departments may include pilot medical records as part of flight crew management. Confirm scope with customer before migration.

### 5.3 Testing Strategies

**Test environment parity:**
The staging environment used for test migrations must be as close to production as possible (same Convex instance version, same schema version, same security configuration). Differences between staging and production are a common source of "but it worked in staging" failures.

**Test data sets:**
- **Minimum viable test set:** 100–500 records covering all entity types and edge cases
- **Representative sample:** 10% of production data volume, stratified across entity types, date ranges, and status values
- **Full volume test:** Complete dataset run against staging to test performance and catch scale-specific issues

**Migration dry run:**
A dry run executes the full migration pipeline in validation-only mode: all transformation and validation steps run, but no records are written to the target. This catches transformation errors and validation failures without any side effects.

**Regression testing after migration:**
After each test migration, run the full application E2E test suite against the migrated data. This catches cases where migrated data is syntactically valid but breaks application logic (e.g., a status value that passes schema validation but causes a UI rendering error).

### 5.4 Dry Runs

A dry run is a complete migration execution with writes to a throwaway staging database. It is distinct from a test migration in that it uses production data (with PII handled appropriately).

**Dry run checklist:**
- [ ] Source data export complete and checksummed
- [ ] Staging environment reset to clean state
- [ ] ETL pipeline run with production data
- [ ] Validation suite executed; results reviewed
- [ ] Row count reconciliation passed
- [ ] Referential integrity checks passed
- [ ] Sample spot-check performed by customer (10–20 records of each entity type)
- [ ] Migration duration measured (for production window planning)
- [ ] Any validation failures documented and remediation plan agreed
- [ ] Dry run report delivered to customer

**Number of dry runs:**
- Simple migrations (< 10K records, single source system): 1 dry run before production
- Complex migrations (100K+ records, multiple source systems): 2–3 dry runs minimum
- Regulated migrations (FAA maintenance records): customer and Athelon sign off on dry run results before production migration is scheduled

### 5.5 Migration Monitoring Dashboards

During a live migration, operational visibility is critical.

**Key metrics to monitor in real time:**
- Records processed per second (throughput)
- Records successfully loaded vs. failed
- Validation failure rate (alert if > 1%)
- Queue depth (for async migration pipelines)
- API rate limit headroom (for API-based migrations)
- Source system connectivity health
- Target system (Convex) write latency and error rate
- Memory and CPU utilization of migration worker processes

**Alerting thresholds:**
- Migration throughput drops below 50% of expected baseline → page on-call
- Validation failure rate exceeds 0.1% → pause migration, investigate
- Any records in the "PII quarantine" bucket → immediate review
- Migration projected to exceed maintenance window → escalate decision: extend window or roll back

**Dashboard tooling:**
- Grafana + Prometheus for real-time metrics
- Custom Node.js progress reporter writing to a shared status page
- Slack webhook integration for automated status updates at 25%/50%/75%/100% completion milestones

---

## 6. Performance & Scale

### 6.1 Batch Processing

Migrating records one at a time is orders of magnitude slower than batch processing.

**Convex rate limits and batch strategy:**
Convex mutations have per-function rate limits. For migrations, use:
- `batchCreate` patterns that write multiple records per mutation call
- Target 100–500 records per batch depending on record size
- Measure throughput at different batch sizes during dry run; choose the size that maximizes throughput without hitting rate limits

**Parallel batch processing:**
Run multiple migration workers in parallel, each processing a disjoint partition of the source data. Partition by:
- Customer ID (for multi-tenant migrations)
- Date range (for historical data migrations)
- Entity type (process aircraft, customers, and parts catalog in parallel; wait for these to complete before starting work orders)

**Dependency-aware scheduling:**
Use a dependency graph to determine which entity types can be migrated in parallel vs. must be sequential. Aircraft and customers have no dependencies; work orders depend on both aircraft and customers being present.

### 6.2 Rate Limiting

**Convex rate limits:**
Convex enforces function call rate limits. During migration, avoid triggering rate limit errors by:
- Implementing exponential backoff with jitter on rate limit responses
- Monitoring rate limit headers and proactively slowing down before hitting limits
- Scheduling large migrations during off-peak hours when normal application traffic is low

**Source API rate limits:**
When extracting from source APIs:
- Check API documentation for rate limit tiers (requests/minute, requests/day)
- Calculate migration duration based on rate limits: 10K records at 1,000 requests/minute = 10 minutes minimum
- Use the maximum allowed rate only during dedicated migration windows, not during normal business hours if the source system is still in use

### 6.3 Handling Large Datasets (100K+ Records)

**Streaming vs. in-memory:**
For datasets > 100K records, never load the entire dataset into memory. Use streaming transformers that process records in fixed-size chunks.

```typescript
// Pseudocode: streaming migration pipeline
const sourceStream = createSourceStream(csvPath);
const transformer = createTransformerStream(transformationRules);
const validator = createValidatorStream(zodSchema);
const loader = createConvexLoaderStream(convexClient, { batchSize: 200 });

sourceStream
  .pipe(transformer)
  .pipe(validator)
  .pipe(loader)
  .on('finish', () => runReconciliation());
```

**Checkpoint/resume:**
For migrations that take hours, implement checkpointing so a failed migration can resume from where it left off rather than starting over.
- Write a checkpoint record after each successfully committed batch
- On resume, skip all records before the last checkpoint
- Checkpoint granularity: every 1,000–5,000 records for large migrations

**Estimated migration times (rough benchmarks):**
| Record Count | Simple Records | Complex Records |
|---|---|---|
| 10K | 5–10 min | 15–30 min |
| 100K | 1–2 hours | 3–6 hours |
| 1M | 10–20 hours | 24–48 hours |
| 10M+ | Multi-day; requires incremental strategy | |

*Complex records = large text fields, many relationships, validation-heavy*

### 6.4 Incremental / Delta Sync Strategies

After the initial migration, delta sync keeps the target system up to date with changes in the source system during the parallel running period.

**Change Data Capture (CDC):**
- Most reliable method for tracking changes without modifying source application
- Reads the database transaction log (binlog for MySQL, WAL for Postgres)
- Tools: Debezium (open source), AWS DMS CDC mode
- Delivers a stream of INSERT/UPDATE/DELETE events

**Polling-based delta sync:**
- Simpler than CDC but less real-time
- Query source for records modified after a high-watermark timestamp: `WHERE updated_at > :last_sync_time`
- Requires source schema to have a reliable `updated_at` field (not all legacy systems have this)
- Suitable for sync intervals of 15 minutes or more

**Webhook-based delta sync:**
- Source system pushes change notifications to Athelon migration endpoint
- Near-real-time; no polling overhead
- Requires source system to support webhooks (not all legacy MRO systems do)

**Delta sync for MRO regulated records:**
Delta sync of FAA maintenance records raises a question of record authority: which system is the "system of record" during the delta sync period? This must be explicitly defined and communicated to the customer. Best practice: maintenance records are written to Athelon first during shadow running, with back-sync to legacy (not forward-sync from legacy to Athelon).

---

## 7. Post-Migration

### 7.1 Data Verification Workflows

After production migration completes, a structured verification workflow ensures data integrity before the customer declares the migration complete.

**Verification workflow steps:**
1. **Automated checks** — run the full validation suite against production data; must pass with 0 critical failures
2. **Quantitative reconciliation** — customer reviews row counts by entity type and confirms they match their expectations
3. **Qualitative spot-check** — customer selects 10–20 specific records (aircraft they know well, recent work orders, critical AD compliance records) and verifies them manually in Athelon against source system
4. **Functional walkthrough** — customer performs their most common workflows in Athelon using migrated data (open a work order, look up an aircraft's maintenance history, review a customer's open balance)
5. **Edge case verification** — verify specific records that were flagged during dry runs or had special transformation handling

**Verification sign-off document:**
Customer signs a migration acceptance document confirming:
- Record counts are as expected
- Spot-checked records are accurate
- Any known discrepancies (from migration scope document) are acknowledged
- Customer is satisfied with the migration and authorizes transition to Athelon as the system of record

### 7.2 Customer Sign-Off Processes

**Formal sign-off is critical for:**
- Starting the source system sunset clock
- Establishing Athelon as the legal system of record for FAA maintenance records
- Triggering billing transition (if migration is tied to contract start date)
- Releasing the professional services team from migration responsibilities

**Sign-off document minimum contents:**
- Migration date and time
- List of entity types migrated and record counts
- List of entity types excluded from migration and reason
- List of known data quality issues accepted by customer
- Statement of acceptance: "Customer hereby accepts the migrated data and designates [target system] as the system of record for all migrated records as of [date]"
- Customer authorized signatory name, title, and signature
- Athelon authorized signatory name and signature

**Digital signatures:**
For FAA-related records, the sign-off document should be stored with a digital signature (DocuSign, Adobe Sign) creating an immutable audit record of when the system-of-record transition occurred.

### 7.3 Historical Data Access Policies

After cutover, customers often need access to their data from the legacy system. Define a clear policy before migration.

**Policy options:**
- **Read-only legacy access:** Legacy system remains accessible in read-only mode for a defined period (typically 6–12 months). Customer can look up historical records but cannot create new records.
- **Historical data export:** Before decommissioning, provide the customer a full export of their legacy data in a standard format (CSV, JSON). Customer keeps this as an archive.
- **Athelon archive view:** Surface historical-only records in Athelon with a clear visual indicator ("Migrated Record — Legacy System") and read-only status. This is the highest-value option for customers.
- **Data escrow:** Store a cryptographically-signed export of the customer's legacy data in escrow. Customer can access it on request. Useful for regulatory audits where original records may need to be produced.

**FAA maintenance record retention policy:**
Under FAA regulations:
- 14 CFR 43.11: Maintenance records must be kept by the aircraft owner/operator
- 14 CFR 91.417: Aircraft records must be retained until work is repeated, superseded, or for specified time periods (e.g., total time records kept until aircraft is scrapped)
- Athelon's historical data access policy must align with these retention requirements; recommending 7-year minimum retention for all migrated maintenance records

### 7.4 Sunset Timelines for Old System Access

**Recommended sunset timeline:**
- **Day 0:** Migration complete, customer signed off, Athelon is system of record
- **Day 1–30:** Full legacy access; all new records go to Athelon; legacy is read-only
- **Day 31–90:** Legacy access continues read-only; Athelon sends "X days remaining" notifications
- **Day 91:** Legacy access ends (or transitions to data escrow)
- **Day 91+:** Data escrow available on request; Athelon maintains historical archive view

**Early sunset incentives:**
Some SaaS platforms offer billing credits for customers who decommission legacy systems early (reduces dual-licensing cost for the customer). This can accelerate adoption and reduce the risk of customers drifting back to legacy workflows.

**Sunset exceptions:**
Customers undergoing an FAA audit during the sunset period should have their legacy access extended until the audit closes. Athelon should have a formal process for requesting a sunset extension.

---

## 8. Case Studies

### 8.1 Salesforce — Data Migration at Scale

Salesforce's migration methodology (documented in their Implementation Playbook) is a widely-cited B2B SaaS benchmark.

**Key practices:**
- **Data Loader tool** — Salesforce provides a free, open-source desktop tool for CSV-based import/export. It supports upsert operations using external IDs, enabling idempotent loads.
- **External ID pattern** — Salesforce introduced the concept of an external ID field on every migrated record. This stores the source system's primary key, enabling deduplication and re-runs without creating duplicates. This pattern is now widely adopted across B2B SaaS.
- **Sandbox validation** — all migrations are tested in a Salesforce Sandbox (a full copy of the production org) before production. The sandbox is refreshed from production before the test migration begins.
- **Data quality scoring** — Salesforce Professional Services uses a standardized data quality assessment scorecard to benchmark source data before scoping a migration project.

**Lesson for Athelon:** Adopt the external ID pattern. Every migrated record should store the source system name + source record ID. This enables safe re-runs, deduplication, and a clear audit trail back to the origin.

### 8.2 HubSpot — CRM Migration Best Practices

HubSpot migrates customers from Salesforce, Zoho, Pipedrive, and custom systems. Their migration approach reflects CRM-specific complexity (many contact records, complex association graphs).

**Key practices:**
- **Association-first migration** — HubSpot migrates contacts and companies before deals and activities, ensuring that associations (which link records) resolve correctly
- **Deduplication before import** — HubSpot's import tool runs automatic deduplication on contact email addresses; exact duplicate emails are merged, near-duplicates are flagged for review
- **Property mapping UI** — the import wizard allows customers to visually map source columns to HubSpot properties; unmapped columns can be imported as custom properties or skipped
- **Activity history trade-off** — HubSpot explicitly tells customers that activities (emails, calls, meetings) from legacy systems will appear as text notes, not as native activity objects. This is a documented, accepted data loss.

**Lesson for Athelon:** Be explicit about the "text note" fallback for records that cannot be fully modeled in Athelon. Storing them as notes preserves the information while being honest about the modeling limitation.

### 8.3 Stripe — Financial Data Migration

Stripe's migration challenges are unique because financial data has strict regulatory requirements and high accuracy demands.

**Key practices:**
- **Immutable financial records** — Stripe never modifies historical charge, payment, or refund records. Migrated financial records are imported as read-only historical entries, not as live Stripe objects.
- **Idempotency keys** — every API call includes an idempotency key derived from the source record ID. This ensures that network failures during migration don't create duplicate charges.
- **Reconciliation-first** — before any data migration, Stripe provides a reconciliation report that compares source system totals (sum of all charges, refunds, etc.) with what will be in Stripe post-migration.
- **PCI compliance during transfer** — card data migrated from legacy PCI-compliant systems uses PCI-compliant data transfer procedures. If the source system is not PCI compliant, card data cannot be migrated (new tokens must be obtained from cardholders).

**Lesson for Athelon:** Financial records (invoices, parts costs, labor rates) should be imported as read-only historical records, not as live financial objects. Reconciliation totals must match before sign-off.

### 8.4 Notion — Content Migration

Notion's challenge is migrating unstructured content (docs, wikis) from Confluence, Notion competitors, and local files.

**Key practices:**
- **Best-effort formatting conversion** — Notion converts source formatting (Confluence wiki markup, HTML) to Notion block format on a best-effort basis. Unsupported elements become plain text blocks with a conversion warning.
- **Import history** — every imported page shows "Imported from [source] on [date]" as a page property. This is always visible to users and creates a permanent audit trail.
- **Batch import jobs** — large workspace imports are queued as background jobs; users receive an email when the import completes. This decouples the import trigger from the import completion, handling large volumes gracefully.

**Lesson for Athelon:** Rich text fields (maintenance notes, discrepancy descriptions) may contain formatting from legacy systems that doesn't translate. Use a "best-effort, warn on failure" approach and always mark migrated records with their source origin.

### 8.5 Asana — Project Management Migration

Asana handles migrations from Jira, Monday.com, Trello, and spreadsheets.

**Key practices:**
- **Hierarchy reconstruction** — project management tools have different hierarchy models (Asana: workspace → team → project → task → subtask; Jira: project → epic → story → task → subtask). Asana maps these structurally and flags hierarchy mismatches.
- **Assignee matching** — Asana tries to match source system usernames/emails to Asana accounts; unmatched assignees are preserved as text annotations on the task description.
- **Attachment migration** — file attachments are re-uploaded to Asana storage; broken attachment links are flagged in the migration report.
- **Public migration status page** — Asana provides a real-time migration status page (separate from the main app) so customers can track progress without logging in.

**Lesson for Athelon:** Technician assignment matching during work order migration must handle the case where source system technician IDs don't match Athelon user accounts. Preserve source technician identity as text on the record; allow customers to re-assign records post-migration.

### 8.6 Veeva Vault — Life Sciences / Regulated Industry Migration

Veeva Vault serves pharmaceutical and life sciences companies with strict regulatory data requirements (FDA 21 CFR Part 11, EU Annex 11). Their migration practices are the closest analog to FAA-regulated MRO data.

**Key practices:**
- **Electronic signature transfer** — Veeva preserves original electronic signatures from source systems as signature metadata (signatory name, date, certification statement) rather than re-executing signatures. This is explicitly permitted by FDA regulations with appropriate documentation.
- **Audit trail continuity** — the migrated audit trail in Vault starts with a migration event that links to the original system's audit trail. This creates a documented chain of custody.
- **Validation documentation** — FDA-regulated Veeva customers receive a formal migration validation report (IQ/OQ/PQ: Installation Qualification, Operational Qualification, Performance Qualification) as part of the migration package.
- **21 CFR Part 11 compliance statement** — Veeva issues a compliance statement confirming that the migrated records meet Part 11 requirements for electronic records.

**Lesson for Athelon:** For FAA Part 145 migrations, Athelon should issue a migration compliance statement confirming that migrated records meet FAA recordkeeping requirements. This is a high-value differentiator in the MRO market.

---

## 9. MRO-Specific Considerations

### 9.1 FAA Recordkeeping Requirements

FAA regulations governing maintenance record retention are specific and non-negotiable. Any migration strategy must account for them.

**14 CFR 43.9 — Maintenance record requirements (general):**
Each person who maintains, performs preventive maintenance, rebuilds, or alters an aircraft must make an entry in the maintenance record containing:
- Description of work performed
- Date of completion
- Name of person performing work
- Certificate type and number of person approving for return to service
- Signature

Migration implication: all four data elements (description, date, name, certificate number, signature) must be preserved as structured data, not collapsed into a free-text note.

**14 CFR 43.11 — Content, form, and disposition of maintenance records:**
Specific content requirements for the maintenance record entry. Migrated records that do not contain all required fields must be flagged for customer review — these are potential regulatory compliance gaps that exist in the source system data.

**14 CFR 91.417 — Maintenance records (owner/operator):**
- Records of maintenance performed must be retained for a minimum period
- Total time in service records must be retained until aircraft is transferred or scrapped
- Current status of applicable ADs must be retained as long as the aircraft is operated

Migration implication: data retention periods in Athelon must align with these regulatory minimum periods, regardless of what the customer's storage/cost preferences are.

**FAA Form 337:**
Major repair and alteration records on FAA Form 337 must be retained indefinitely (one copy goes to the FAA Aircraft Registry, one to the aircraft records). Migrated 337 records must be stored as immutable records with the original FAA copy number.

**FAA 8130-3 Airworthiness Approval Tags:**
Tags issued by the FAA or an FAA-authorized representative (DAR/DER). These have a specific format and must be traceable to specific parts and maintenance events. Migration must preserve tag number, issuance date, issuing authority, and applicable aircraft/part.

### 9.2 AD Compliance History Migration

Airworthiness Directive (AD) compliance records are safety-critical. Migration errors in AD compliance data could result in an aircraft being operated with an outstanding AD — a potentially fatal situation.

**AD compliance migration requirements:**
- Every AD record must include the AD number (e.g., 2023-15-04), revision number, and effective date
- Compliance method (terminating action, repetitive inspection, etc.) must be preserved
- Compliance date and aircraft total time at compliance must be preserved
- Next due date/time (for repetitive ADs) must be recalculated post-migration to verify accuracy
- Any open/outstanding ADs must be flagged prominently in Athelon immediately after migration

**AD data source cross-reference:**
During migration, cross-reference imported AD records against the FAA AD database (available via FAA API at `api.faa.gov`) to verify that:
- AD numbers are valid and exist in the FAA database
- AD effective dates match the FAA database
- AD applicability matches the aircraft's make/model/serial number

Any discrepancies between the customer's legacy AD records and the FAA database must be flagged as high-priority findings requiring customer review before migration acceptance.

### 9.3 Technician Certificate Verification

Maintenance record entries require the signing technician's FAA certificate number. During migration:

- Verify that all technician certificate numbers in the source data conform to the FAA certificate number format
- Cross-reference against the FAA airmen inquiry database (available at FAA.gov) where possible
- Flag any maintenance entries where the technician certificate number is missing or invalid
- For historical records where the technician is no longer active, preserve the original certificate number as-is; do not attempt to update it

### 9.4 Parts Traceability Migration

FAA Part 145 repair stations must maintain parts traceability records. During migration:

- Part number and manufacturer must be preserved as structured fields (not combined into a single string)
- Lot numbers, serial numbers, and batch numbers must be preserved where present
- Shelf-life expiration dates must be migrated and rechecked against current date
- FAA 8130-3 tag associations must be preserved (which 8130-3 approved which part for which aircraft/WO)
- Suspect unapproved parts (SUP) history must be migrated and flagged in Athelon

### 9.5 Multi-Location / Multiple Certificate Considerations

Some MRO operators hold multiple FAA Part 145 certificates (e.g., a main facility and a satellite hangar). Migration must account for:

- Records associated with each certificate location must be tagged with the originating location
- Different inspection authorization (IA) or DER authorizations per location
- Different capability lists (OPSPECs or RSM capabilities) per location
- User accounts may need to be associated with specific locations for RBAC purposes

### 9.6 Chain-of-Custody Documentation

When migrating between MRO systems, the chain of custody of maintenance records must be documented:

- The migration package should include a cover document stating: previous system name, extraction date, migration date, and Athelon as the receiving system
- The cover document should be signed by an authorized representative of both the customer (Part 145 certificate holder) and Athelon
- This documentation should be stored as part of the customer's account records in Athelon and should be producible on demand during an FAA audit

---

## 10. Key Takeaways

### Architecture
- **Use staged migration over big-bang** for any dataset with > 50K records or FAA-regulated content. Staged migration reduces blast radius and allows incremental validation.
- **Shadow/parallel running is the safest pattern** for zero-downtime migrations, but adds operational complexity. Use it for migrations where downtime is unacceptable.
- **Define rollback criteria before migration begins**, not after something goes wrong. A 30-day source system preservation window is appropriate for regulated MRO data.

### Data Quality
- **Garbage in, garbage out.** Source data quality is the primary driver of migration success or failure. Invest in pre-migration audits and give customers time to remediate issues before migration day.
- **Store source IDs on every migrated record** (the external ID pattern from Salesforce). This enables safe reruns, deduplication, and audit trails.
- **Never hard-delete migrated records.** FAA regulations require record retention; Athelon's migration policy should default to preserve.

### Tooling
- **Build a lightweight custom migration pipeline** rather than using a generic ETL tool. Domain-specific transformation rules and FAA compliance requirements justify the investment.
- **Self-service import is appropriate for non-regulated data** (aircraft catalog, customer profiles, contacts). White-glove migration is required for FAA maintenance records, AD compliance history, and work order history.
- **The external ID field + idempotent upsert** combination is the single most important technical pattern for reliable migrations.

### Risk & Compliance
- **FAA compliance is non-negotiable.** Every migration decision should be evaluated against FAA 14 CFR Part 43 and 91.417 requirements. When in doubt, preserve more data, not less.
- **Issue a formal migration compliance statement** for Part 145 customers, confirming that migrated records meet FAA recordkeeping requirements. This is a high-value differentiator.
- **Get written customer sign-off** before decommissioning source systems. The sign-off document is Athelon's legal protection if questions arise about the completeness or accuracy of migrated data.

### Performance
- **Batch size matters.** Migrating 500 records per Convex mutation call is dramatically faster than one-at-a-time. Profile batch sizes during dry runs.
- **Partition large migrations** by entity type and date range. Run independent partitions in parallel where dependency graph allows.
- **Implement checkpoint/resume** for migrations that take more than 30 minutes. Re-running from scratch on failure is expensive and frustrating.

### Post-Migration
- **Historical data access policy must be defined before migration begins**, not after. Customers who discover they cannot access their pre-migration records will lose trust.
- **AD compliance history is uniquely safety-critical.** Cross-reference migrated AD records against the FAA AD database as a standard step. Any discrepancy is a potential airworthiness issue.
- **Maintain a 7-year minimum retention period** for all migrated FAA maintenance records, regardless of customer storage preferences. This aligns with standard FAA record retention guidance.

### Athelon-Specific Recommendations

1. Build a **Migration Health Dashboard** — real-time progress, validation status, and reconciliation metrics during live migrations.
2. Create a **Source System Connector Library** — pre-built transformation rules for CAMP Systems, Quantum MX, AvTrak, and AircraftLogs (the four most common migration sources in the SMB MRO market).
3. Define a **FAA Record Migration Compliance Standard** — a documented, auditable process that Athelon follows for every FAA-regulated record migration. Include this standard in customer contracts.
4. Implement **Immutable Migration Audit Log** — every migration event (extract, transform, validate, load, reject) is written to an append-only log stored in Convex. This log is accessible to customers for FAA audit purposes.
5. Offer a **Migration Data Room** — a secure, time-limited portal where customers upload source data exports and Athelon's migration team downloads them. Eliminates ad-hoc file transfer via email or unencrypted FTP.

---

*Document version 1.0 — Athelon MRO Platform, Data Migration Onboarding Research Series*
*Next document: 02-competitor-data-models.md (analysis of CAMP Systems, Quantum MX, AvTrak schema structures)*
