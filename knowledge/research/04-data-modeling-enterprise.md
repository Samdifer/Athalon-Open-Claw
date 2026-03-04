# 04 — Data Modeling for Enterprise Systems

## Why Data Modeling Is the Hardest Part

In most software, bad code can be refactored. A poorly chosen data model is much harder to fix. The data model is the foundation every feature is built on, and by the time the problems are apparent — when scale exposes a missing index, when a regulatory audit exposes a missing audit field, when a new feature requires a schema change that breaks ten existing queries — fixing it is expensive, risky, and disruptive.

**Get the data model right early.** This document covers the principles and patterns that make enterprise data models correct, maintainable, and auditable over multi-year system lifetimes.

---

## Normalization vs. Denormalization

### Normalization

**Database normalization** (1NF through 5NF) is a formal framework for eliminating redundancy and maintaining data integrity. The core principle: store each fact once, in exactly one place.

| Normal Form | What It Eliminates |
|---|---|
| 1NF | Repeating groups, non-atomic values |
| 2NF | Partial dependencies on composite keys |
| 3NF | Transitive dependencies (non-key fields depending on other non-key fields) |
| BCNF | All remaining anomalies from functional dependencies |

**Why normalize?** Updates to a normalized schema change data in one place. Updates to a denormalized schema require finding and updating every copy of the data, which creates inconsistency when copies diverge.

> **Pattern:** Default to 3NF normalization for transactional (OLTP) data. Enterprise systems that manage operational workflows should start normalized.

### Denormalization

**Denormalization** deliberately introduces redundancy for read performance or query simplicity. Reporting tables, materialized views, and event sourcing projections are all forms of denormalization.

> **Pattern:** Denormalize for **read models** (reporting, dashboards, exports) while keeping your **write model** normalized. This is the Command Query Responsibility Segregation (CQRS) pattern: separate the model you write to from the model you read from.

> **Anti-pattern:** Denormalizing the primary transactional tables because queries are slow. The right fix for slow queries is indexing and query optimization, not redundant data storage.

---

## Immutability Classes

Not all records should be treated the same way. Enterprise systems — especially regulated ones — benefit from explicitly categorizing records by how they may change after creation.

### Class 1: Immutable Records

Records that can **never be modified or deleted** after creation. The only allowed operation is insert.

**When to use:** Audit logs, completed maintenance records, signed inspection reports, finalized regulatory compliance records, executed financial transactions.

**How to enforce:**
- Database: grant INSERT-only permissions on the table to the application role; no UPDATE or DELETE
- Application: the mutation layer raises an error if any code path attempts to modify these records
- Convention: all fields are non-nullable, with no `updated_at` column (there is no update)

> **Regulated context:** FAA, FDA, SOX, and similar regulatory frameworks often require that certain records be immutable after creation. This is not a nice-to-have — violations are audit findings. The system must make modification technically impossible, not merely discouraged.

---

### Class 2: Append-Only History

Records where the current state matters but all historical states must also be preserved. Changes create **new records** rather than updating existing ones. The most recent record is the current state; previous records are the history.

**When to use:** Compliance status changes, discrepancy lifecycle states, corrective action amendments, deferred maintenance approvals.

**Implementation pattern:**

```
adCompliance
  id
  workOrderId
  directiveId
  status           -- "deferred" | "in_progress" | "completed"
  recordedAt       -- server timestamp
  recordedBy       -- actor ID
  supersededById   -- NULL if current; points to the newer record if superseded
```

To get the current status: find the record where `supersededById IS NULL`.
To get the full history: retrieve all records ordered by `recordedAt`.

> **Why it matters:** Append-only history means you can always answer "what did we think we knew at 2:00 PM on March 15?" — a question that regularly comes up in regulatory investigations and customer disputes. Systems that overwrite the current state lose this capability.

---

### Class 3: Soft-Deletable / Updatable Records

Records that represent evolving state and may be updated or logically deleted. The key constraint is that mutations must be logged.

**When to use:** Contact information, work notes, configuration, user preferences, anything that isn't a regulated record.

**Implementation pattern:** Always include:
- `updatedAt` — timestamp of last modification
- `updatedBy` — actor who made the change
- `isDeleted` (boolean) — logical deletion flag; physical deletion is avoided

> **Anti-pattern:** Hard-deleting records from a transactional ERP. Even for Class 3 records, physical deletion creates referential integrity problems and removes the ability to answer historical queries. Use logical deletion (soft delete) instead.

---

## Audit Fields

Every entity in an enterprise data model should carry a minimum set of audit fields:

| Field | Type | Applies To |
|---|---|---|
| `createdAt` | timestamp (server) | All records |
| `createdBy` | user/actor ID | All records |
| `updatedAt` | timestamp (server) | Class 3 records only |
| `updatedBy` | user/actor ID | Class 3 records only |
| `version` or `seq` | integer | Optimistic concurrency, history tracking |

> **Pattern:** Set `createdAt` and `updatedAt` in the server/database layer, never accept them from the client. A client-provided timestamp is untrustworthy and can be forged.

> **Anti-pattern:** Audit fields added as an afterthought to existing tables. Adding audit fields to a live production table with millions of rows requires a schema migration that must handle existing records (with nulls or defaults). Add them from day one.

---

## Temporal Data Patterns

Many business facts are only true for a period of time. An employee's salary, a product's price, a regulatory deferral's validity window, an equipment certification's effective dates — all of these have a start and end date.

### Effective Dating

Add `effectiveFrom` and `effectiveTo` columns to represent the validity window:

```
certifications
  id
  technicianId
  certType         -- "A&P" | "IA" | ...
  issuedAt         -- when the certificate was issued
  effectiveFrom    -- when it becomes valid
  effectiveTo      -- when it expires (NULL = does not expire)
  isRevoked        -- boolean; revoked is different from expired
```

To query "what certifications are active right now?":
```sql
WHERE effectiveFrom <= NOW()
  AND (effectiveTo IS NULL OR effectiveTo > NOW())
  AND isRevoked = false
```

### Slowly Changing Dimensions (SCDs)

In data warehousing, **Slowly Changing Dimensions** are reference data that changes infrequently but must preserve history. The three common types:

| SCD Type | Behavior |
|---|---|
| **Type 1** | Overwrite — no history preserved |
| **Type 2** | New row for each change — full history preserved with `effective_from` / `effective_to` |
| **Type 3** | Add a column for previous value — only one level of history |

For regulated enterprise systems, **SCD Type 2** is almost always required. You need to know not just what a record says today, but what it said at any point in the past.

---

## Foreign Key Discipline

### In Relational Databases

Enforce foreign keys at the database level, not just the application level. An application-level-only FK constraint fails silently when records are inserted out of order, when direct database access occurs, or when the application has a bug.

> **Pattern:** Every relationship between tables should have a corresponding database-level foreign key constraint, with an explicit decision about cascade behavior (`ON DELETE RESTRICT` vs `CASCADE` vs `SET NULL`).

### In Serverless/Document/NoSQL Contexts

NoSQL and serverless databases (Convex, DynamoDB, Firestore) typically do not support native foreign key constraints. The application layer must compensate:

- Validate referenced record existence before inserting
- Use transactions to atomically validate and insert together
- Implement soft-delete patterns (never hard-delete referenced records)
- Consider a periodic consistency check job for detecting orphaned records

> **Anti-pattern:** Storing raw IDs as strings with no validation, assuming referenced records will always exist. In any system with concurrent writers, this assumption fails eventually.

---

## Regulated Data Domains

Regulated industries impose additional data integrity requirements beyond standard software engineering best practices.

### Record Retention

Regulatory frameworks specify minimum retention periods for different record types:

- FAA Part 145 maintenance records: 2 years minimum, 10+ years for major repairs on air carriers
- SOX financial records: 7 years
- HIPAA patient records: 6 years (or longer per state law)

> **Pattern:** Tag records with their retention class at creation. Build a retention management system that enforces these policies rather than relying on individual administrators to remember. Never delete records within their retention window.

### Tamper Evidence

For records that must survive regulatory scrutiny, the system should be able to prove that a record has not been modified since creation. Common techniques:

- **Cryptographic hashing:** On record creation, compute a hash over the canonical JSON representation of the record and store it. On audit, recompute the hash and compare.
- **Signed records:** Records with human signatures capture the signature as a hash bound to the signer's identity and the record content at the moment of signing. If the record content changes, the signature is no longer valid.
- **Blockchain/immutable ledger:** For highest-assurance contexts, write record hashes to an external immutable ledger.

> **Regulated context:** An auditor may ask "can you prove that this maintenance record has not been altered since it was signed?" If the answer is no, that is a finding. Build tamper evidence into the data model from the start.

### Traceability Chains

Regulated operations often require a complete chain of custody — every step in a process traced back to its initiating event, every part traced to its origin.

A parts traceability chain might look like:

```
PartOrder → PartReceiving → InspectionRecord → StockEntry → WorkOrderUsage → TaskCardRecord
```

Each link in the chain should be traversable. A regulator should be able to start at a part used in a maintenance action and trace backwards to the original purchase order, or start at a purchase order and trace forward to all the work orders where parts from that order were used.

---

## Schema Migration Strategy

Long-lived enterprise systems evolve over years. Schema migrations are unavoidable. A migration strategy that works in production:

### Expand/Contract Pattern

1. **Expand:** Add new columns/tables alongside the old ones. Make new columns nullable initially.
2. **Migrate:** Backfill new columns for existing records. Update application code to write to both old and new simultaneously.
3. **Cutover:** Update application code to read from new only. Verify no reads of old remain.
4. **Contract:** Remove old columns/tables in a subsequent migration.

> **Why it matters:** Zero-downtime migrations in production require backwards-compatible changes at each step. Expand/Contract ensures that any point during the migration, both old and new application versions can work with the schema.

### Never Drop Columns in Production Without a Plan

Dropping a column breaks any existing queries that reference it — including application code that hasn't been deployed yet in a blue/green deployment, analytical queries, audit tooling, and regulatory reporting scripts.

> **Pattern:** Before dropping a column: (1) Remove all application references to it and deploy. (2) Verify with monitoring that no queries reference it. (3) Then drop it in a subsequent migration.

### Migration Versioning

Every migration should be:
- Uniquely numbered (sequential or timestamp-based)
- Idempotent (can run twice without breaking anything)
- Tested against a copy of production data before running on production
- Reversible where possible (write a down migration alongside every up migration)

---

## Anti-Patterns in Enterprise Data Modeling

### Nullable Fields as Flags

Using `NULL` to mean multiple things: "this field doesn't apply to this record type," "this field hasn't been set yet," and "this value was explicitly cleared" are three different semantic states, all collapsed into NULL.

> **Pattern:** Use explicit boolean flags or status columns instead of relying on NULL semantics. `isExpired BOOLEAN NOT NULL DEFAULT false` is unambiguous. `expiresAt IS NULL` might mean "doesn't expire" or "nobody set this yet."

---

### Polymorphic Foreign Keys

A column that sometimes references Table A and sometimes references Table B, distinguished by a `type` column. This breaks referential integrity (you cannot write a foreign key constraint that references different tables conditionally), makes queries complex, and produces mysterious bugs when the type column is wrong.

> **Pattern:** Use separate foreign key columns (`workOrderId`, `inspectionId`) rather than a polymorphic `referenceId` + `referenceType` combination.

---

### Soft Deletes Without Audit

Adding `isDeleted = true` to "delete" records without recording who deleted them, when, and why. All the data loss risk of deletion, with none of the auditability of a proper approach.

> **Pattern:** Any soft delete should automatically write an audit log entry capturing actor, timestamp, and reason. Consider a separate `deletionLog` table rather than just flipping a flag.

---

### Encoding Multiple Facts in One Column

A `status` column with values like `"signed_by_inspector_pending_qa"` — multiple facts collapsed into a single string. Adding a new state requires changing the enum and updating every piece of code that reads the column.

> **Pattern:** Separate orthogonal states into separate boolean or enum columns. `isSignedByInspector`, `isPendingQA` are independently queryable and independently settable. A combined status string is a denormalization that usually backfires.

---

### Using Application-Layer IDs as Natural Keys

Treating user-facing identifiers (invoice numbers, part numbers, tail numbers) as primary keys. These are edited by users, change over time, and appear in external systems — making them poor candidates for internal FK references.

> **Pattern:** Use system-generated surrogate keys (UUIDs, database sequences) as primary keys for all FK relationships. Expose user-facing natural keys as unique-indexed additional columns.

---

## Further Reading

- C.J. Date — *An Introduction to Database Systems* (normalization theory)
- Martin Fowler — *Patterns of Enterprise Application Architecture* (data source patterns)
- Greg Young — *CQRS and Event Sourcing* (append-only history patterns)
- Vaughn Vernon — *Implementing Domain-Driven Design* (aggregate and entity modeling)
- NARA — *Federal Records Management Guidelines* (retention requirements framework)
