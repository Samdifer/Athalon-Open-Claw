# 02 — ERP Architecture Patterns

## What Defines an ERP?

An **Enterprise Resource Planning (ERP)** system is software that integrates the core business processes of an organization — finance, inventory, manufacturing, HR, procurement, compliance — into a single, unified data model. The defining characteristic is **shared state across domains**: a purchase order created in procurement directly affects the inventory count visible in the warehouse module, which affects the cost calculations visible in finance.

This integration is ERP's core value and its core complexity challenge. The more domains share state, the more carefully that state must be managed.

Characteristics that distinguish ERP from general-purpose applications:

| Characteristic | Implication |
|---|---|
| **Multi-domain shared data** | Schema design and mutation design must enforce integrity across domain boundaries |
| **Role-differentiated access** | Not all users should see or modify the same data; RBAC is a first-class concern |
| **Long-lived records** | Data may need to be readable and auditable for 7–30 years, long after the people who created it are gone |
| **Regulated workflows** | Many ERPs operate in industries where the *process* itself is subject to audit — not just the data |
| **High correctness bar** | A wrong number in a consumer app is annoying; in an ERP it might be illegal |

---

## Domain-Driven Design (DDD)

**Domain-Driven Design** is the most influential architectural philosophy for complex enterprise software. Introduced by Eric Evans in 2003, DDD starts from the premise that the most important asset in enterprise software is an accurate model of the business domain — and that the code should reflect that model directly.

### Bounded Contexts

A **bounded context** is an explicit boundary within which a domain model applies consistently. The same term may mean different things in different contexts. "Customer" in a sales context might be a prospect pipeline entry; "Customer" in a billing context is a contract holder with payment terms. Conflating these into a single `Customer` table across all domains creates coupling, confusion, and bugs.

> **Pattern:** Identify the primary bounded contexts early. Give each its own schema, its own vocabulary (ubiquitous language), and its own team ownership. Cross-context communication happens through explicit contracts, not shared tables.

**Common bounded contexts in an ERP:**

- **Order Management** — work orders, job costing, task tracking
- **Inventory / Parts** — stock levels, part traceability, procurement
- **Compliance** — regulatory directives, deferral management, sign-off workflows
- **Workforce** — technicians, certifications, scheduling
- **Financials** — billing, cost accounting, vendor payments
- **Customer** — customer records, contracts, service history

### Aggregates

An **aggregate** is a cluster of related objects treated as a unit for data changes. The aggregate has a **root** — the primary entity — through which all mutations flow. Direct modification of internal entities without going through the root is prohibited.

Example: a `WorkOrder` aggregate root contains `TaskCards`, each containing `TaskCardSteps`. No external code should directly mutate a `TaskCardStep` — it must go through the `WorkOrder` aggregate root, which enforces invariants across the whole.

> **Why it matters:** Aggregates are the primary mechanism for **enforcing business invariants**. If you can only close a work order through the `WorkOrder` aggregate root, then the root can enforce that all task cards are signed, all discrepancies are resolved, and a Return to Service record exists — every time, without the caller needing to know about those rules.

### Ubiquitous Language

DDD requires that domain experts and engineers use **exactly the same words** for the same concepts. This sounds obvious — it is routinely violated. When the business says "return to service" and the code says `completeWorkOrder`, there is a translation gap that will eventually produce a misunderstood requirement and a bug.

> **Pattern:** Build a domain glossary. Define every term precisely. When you write code, use those exact terms. When a domain expert says a new word you don't recognize, add it to the glossary before coding.

---

## Multi-Tenancy Models

A **multi-tenant** ERP serves multiple independent organizations (tenants) from a single system. Data isolation between tenants is non-negotiable: Tenant A must never see Tenant B's data, even accidentally.

### Schema-Per-Tenant

Each tenant gets a separate database schema (or separate database). Data isolation is enforced at the infrastructure level.

**Pros:** Strong isolation, simple queries within a tenant, easy per-tenant backup/restore.
**Cons:** Schema migrations must be applied across N schemas, operational complexity scales with tenant count, expensive to cross-tenant for analytics.

### Row-Level Isolation (Shared Schema)

All tenants share the same tables. Every table has a `tenantId` column. Every query is required to filter by `tenantId`.

**Pros:** Simpler migrations, lower infrastructure cost, easier to build cross-tenant analytics.
**Cons:** Isolation is a software guarantee, not infrastructure. A missing `WHERE tenantId = ?` clause in one query is a data breach. Requires rigorous enforcement — ideally through query middleware that automatically appends the tenant filter.

> **Anti-pattern:** Relying on developers to manually add `tenantId` filters in every query. This will fail. Use row-level security (RLS) at the database layer, or a query builder that enforces tenant scoping at the framework level.

### Hybrid

High-value or regulated tenants get schema-per-tenant isolation; smaller tenants share a schema. Common for SaaS ERPs with enterprise tiers.

---

## Role-Based Access Control (RBAC)

In an ERP, not all users are equal. A technician can log labor; they cannot approve a Return to Service document. An inspector can sign off an airworthiness finding; they cannot create a work order. A DOM (Director of Maintenance) sees financial summaries; a line tech does not.

**RBAC** assigns permissions to **roles**, and roles to **users**. When authorization decisions are required, the system evaluates the user's role membership, not individual permission grants.

### Permission Hierarchy

Well-designed RBAC distinguishes:

| Concept | Meaning |
|---|---|
| **Permission** | A single atomic capability (e.g., `work_order:close`, `rts:sign`) |
| **Role** | A named collection of permissions (e.g., `inspector`, `technician`, `dom`) |
| **User** | A person assigned one or more roles, within a tenant/org context |

> **Pattern:** Define permissions at the operation level, not the screen level. "Can view the inspection screen" is fragile as the UI evolves. "Can execute `inspection:approve`" survives UI redesigns and is testable without a browser.

### Claim-Based Auth

Modern cloud-native ERPs implement RBAC via **JWT claims**. When a user authenticates, the auth provider issues a token containing claims such as:

```json
{
  "sub": "user_abc123",
  "org_id": "org_rmts",
  "role": "inspector",
  "cert_ids": ["A&P", "IA"]
}
```

Every backend function reads the JWT, extracts the relevant claims, and enforces authorization before executing.

> **Why it matters:** Claims-based auth puts authorization data in a verifiable, tamper-evident token. There is no round-trip to a permissions database on every request. This is critical for performance at scale and for offline or distributed architectures.

### Org Context

In a multi-tenant ERP, roles are scoped to an **organization**. A user might be an `inspector` at Org A and a `technician` at Org B if they consult for multiple repair stations. The auth system must carry org context alongside role claims, and backend functions must use both.

---

## Audit Trail Patterns

Enterprise ERPs — especially in regulated industries — require a complete, tamper-evident record of who did what, when, and why. This is the **audit trail**.

### Append-Only Event Log

> **Pattern:** Never update or delete audit log records. Every state change in the system produces a new audit log entry. The audit log grows monotonically.

A minimal audit log entry captures:

| Field | Purpose |
|---|---|
| `id` | Unique identifier |
| `timestamp` | When the event occurred (server time, not client) |
| `actorId` | Who performed the action |
| `actorRole` | Their role at time of action |
| `action` | What was done (e.g., `WORK_ORDER_CLOSED`) |
| `targetTable` | Which entity was affected |
| `targetId` | Which specific record was affected |
| `before` | Snapshot of relevant state before the change (optional but valuable) |
| `after` | Snapshot of relevant state after the change |
| `metadata` | Additional context (IP, session, reason, signature hash) |

> **Regulated context:** Regulators performing an audit often pull the audit log first. They want to see a complete, unbroken chain of custody. Gaps — records that changed with no corresponding audit entry — are findings. Audit log writes must be **atomic with the domain mutation** that triggers them, never in a separate transaction.

### Who / What / When / Why

Best-in-class audit trails capture:

- **Who:** Actor identity, role, org context — not just a user ID
- **What:** The specific action and the exact data changed
- **When:** Server-authoritative timestamp, never trust client-provided timestamps
- **Why:** Reason for change when required (e.g., corrective action text on a discrepancy)

### Immutability Enforcement

In regulated systems, certain record types must be **immutable** after creation — not soft-deleted, not updated. The database and the application layer must both enforce this.

See [04-data-modeling-enterprise.md](./04-data-modeling-enterprise.md) for a detailed treatment of immutability classes.

---

## Integration Patterns

ERPs rarely exist in isolation. They integrate with accounting systems, supplier portals, regulatory databases, scheduling tools, customer portals, and more.

### Event-Driven Integration

The ERP publishes domain events when significant state changes occur (e.g., `WorkOrderClosed`, `PartReceived`, `ADComplianceRecorded`). External systems subscribe to relevant events and react.

**Pros:** Loose coupling — the ERP does not know or care about its subscribers. New integrations can be added without changing the ERP. Resilient to downstream system outages (events queue until the subscriber recovers).

**Cons:** Eventual consistency — subscribers lag behind. Idempotency requirements on consumers (the same event may be delivered more than once). More infrastructure complexity (message broker, retry/dead-letter queues).

### API-First Integration

The ERP exposes a documented API. External systems call it synchronously.

**Pros:** Simpler mental model. Immediate consistency — the caller gets a result synchronously.
**Cons:** Tight coupling — the ERP must be available when the caller needs it. The ERP's internal model bleeds into the API contract over time.

> **Pattern:** Design external APIs around **business operations**, not database tables. An API endpoint should map to a business action (`POST /work-orders/{id}/close`) not a CRUD table operation (`PATCH /work-orders/{id}`). This protects internal schema from leaking into public contracts.

### EDI (Electronic Data Interchange)

Legacy integration standard used in aerospace, automotive, and healthcare supply chains. Message formats are rigid (X12, EDIFACT) but very common in parts procurement and traceability contexts.

> **Why it matters:** Any ERP serving aerospace MRO will encounter 8130-3 tag generation and EDI-based parts procurement. Understanding EDI as an integration mechanism — even if not building it from scratch — is essential domain knowledge.

---

## Anti-Patterns in ERP Architecture

### God Tables

A single table that stores many conceptually distinct types of records, distinguished by a `type` column. Starts as convenience ("let's just put all documents here"), ends as an unmaintainable mess where every query needs a type filter and the schema is full of nullable columns that only apply to specific types.

> **Pattern:** Use separate tables for distinct record types. If records share behavior, model that through a shared reference or explicit linking, not by collapsing them into one table.

---

### Status Flags as Enums

Modeling complex business states as a single `status` string column, then proliferating status values until the column has 15 possible values with subtle semantic overlaps and no enforced transition rules.

> **Pattern:** Model status transitions as explicit operations. The allowed next states should be enforced by the application layer, not left to callers to reason about. Consider modeling status as a state machine with documented transitions.

---

### Shared Mutable State Across Tenants

Any shared resource that tenants can both read and modify — a shared sequence, a shared configuration table without tenant scoping, a shared cache without isolation — is a data contamination bug waiting to happen.

> **Anti-pattern:** Global mutable state in any multi-tenant system. Treat every table, every cache key, every counter as tenant-scoped unless you have an explicit, reviewed reason otherwise.

---

### Logic in the Frontend

Business rules (e.g., "a work order cannot be closed if any task card is unsigned") exist in the frontend to give users feedback, but they **must also** be enforced server-side. The frontend can be bypassed. The database mutation cannot be.

> **Pattern:** Consider all frontend validation as UX improvement only. Every business invariant must have a corresponding server-side enforcement in the backend mutation layer.

---

## Further Reading

- Eric Evans — *Domain-Driven Design: Tackling Complexity in the Heart of Software*
- Vaughn Vernon — *Implementing Domain-Driven Design*
- Sam Newman — *Building Microservices* (bounded context decomposition)
- Chris Richardson — *Microservices Patterns* (event-driven architecture patterns)
- OWASP — *Access Control Cheat Sheet*
