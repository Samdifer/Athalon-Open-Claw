# Research Corpus — Production Software & ERP Development Cycles

This folder is a **deep reference library** on how production enterprise software — particularly ERP systems — is conceived, architected, and built. It is written as general-purpose, transferable knowledge applicable across industries and technology stacks.

---

## Purpose

Enterprise Resource Planning (ERP) software is among the most complex class of production systems. Unlike consumer applications, ERPs must:

- Enforce strict data integrity across interrelated business domains
- Support multiple concurrent users with differentiated roles and permissions
- Maintain auditable, tamper-evident records — often under regulatory scrutiny
- Evolve over years without breaking existing data or breaking downstream integrations
- Survive organizational growth, new business lines, and regulatory changes

The documents in this corpus capture **foundational knowledge** that shapes how teams should approach building these systems: the lifecycle models that organize work, the architectural patterns that make systems maintainable, the data modeling discipline that keeps records trustworthy, and the phase-based practices that impose rigor at scale.

---

## Who Should Read This

- **Architects and senior engineers** designing system structure and data models
- **Product managers and program leads** defining phases, gates, and release milestones
- **New team members** onboarding to a complex domain-driven codebase
- **Anyone** building a regulated production system who wants to understand *why* the decisions they encounter were made

---

## Documents

| # | Document | What It Covers |
|---|---|---|
| 01 | [SDLC Fundamentals](./01-sdlc-fundamentals.md) | Lifecycle models (Waterfall, Agile, phase-gated hybrids), stage-gate theory, artifact standards, anti-patterns |
| 02 | [ERP Architecture Patterns](./02-erp-architecture-patterns.md) | DDD, bounded contexts, multi-tenancy, RBAC, audit trails, immutability, integration patterns |
| 03 | [Phase-Based Development](./03-phase-based-development.md) | Phase anatomy, gate reviews, rollback criteria, artifact standards, team coordination |
| 04 | [Data Modeling for Enterprise](./04-data-modeling-enterprise.md) | Immutability classes, append-only history, temporal data, regulated schemas, migration strategy |

---

## Conventions Used Throughout

Throughout these documents, the following callout styles signal special content:

> **Pattern:** A recommended, proven approach worth adopting.

> **Anti-pattern:** A common mistake with documented negative consequences.

> **Why it matters:** Contextual explanation of *why* a principle is important, not just what it is.

> **Regulated context:** Notes specifically relevant when building software under regulatory oversight (FDA, FAA, SOX, HIPAA, etc.).

---

## How to Use This Corpus

These documents are not sequential — read them in any order based on your immediate need. Cross-references between documents are noted inline. Each document stands alone but is more valuable read alongside its siblings.

The corpus is a **living library**: add documents, deepen existing ones, and annotate with real-world case notes as the team encounters new patterns or failure modes in production.
