# Data Migration & Customer Onboarding Research

Research corpus covering B2B SaaS data migration best practices, competitor migration onboarding, and handling customers with unstructured or no data — with MRO/FAA-specific considerations throughout.

**Created:** 2026-03-12

---

## Documents

### [01 — Data Migration Best Practices](./01-data-migration-best-practices.md)
General B2B SaaS migration patterns: ETL pipelines, staged vs big-bang cutover, data mapping/transformation, validation & integrity checks, tooling (self-service vs white-glove), risk management, performance at scale, post-migration verification. Includes case studies from Salesforce, HubSpot, Stripe, Notion, Asana, and Veeva Vault. ~6,000 words.

### [02 — Competitor Migration Onboarding](./02-competitor-migration-onboarding.md)
How to onboard customers switching from competitor products: migration-focused UX flows, "switch from X" playbooks, white-glove vs self-service segmentation, data import UX patterns, transition period management, success metrics. Covers Corridor MX, CAMP, ATP FlightDocs, and paper-based shops. Includes FAA recordkeeping constraints (14 CFR Part 43, 91.417). ~6,500 words.

### [03 — Unstructured Data Onboarding](./03-unstructured-data-onboarding.md)
Onboarding customers with no structured data — paper shops, spreadsheet warriors, tribal knowledge. Covers data archaeology, progressive data collection, smart defaults (FAA N-number registry auto-population, AD database bootstrapping), spreadsheet import strategies, AI/ML-assisted data structuring (OCR for 8130-3 tags, LLM parsing), guided data entry UX, human-assisted onboarding tiers. Success stories from Toast, ServiceTitan, Procore. ~6,500 words.

### [04 — Migration Technical Architecture](./04-migration-technical-architecture.md)
Implementation patterns for building migration infrastructure in Athelon's stack (Convex + React). Import pipeline design, schema mapping engine, conflict resolution, idempotent migrations, API-based migration, audit trail/compliance, multi-tenant isolation. Includes Convex-specific patterns (self-chaining mutations, action/mutation separation) and a 20-week implementation roadmap. ~5,500 words.

### [05 — MRO Industry Migration Specifics](./05-mro-industry-migration-specifics.md)
Aviation MRO-specific migration challenges: FAA regulatory requirements (14 CFR § 43.9, 43.11, 91.417, 121.380, AC 43-9C), traceability chain preservation, back-to-birth requirements for life-limited parts, legal status of digitized records. Covers 8 source systems (Corridor, CAMP, FlightDocs, Quantum MX, WinAir, Traxxall, paper, homegrown). Includes a three-level trust model for migrated records and four-tier data prioritization. ~8,500 words.

---

## Corridor Deep-Dive (Competitor Intelligence)

### [06 — Corridor Data Export & Import](./06-corridor-data-export-import.md)
Deep product analysis of Corridor Aviation Service Software (Continuum Applied Technology, acquired by CAMP/Hearst 2015). Clarifies that "Corridor" and "Corridor MX" are two separate products. Covers 25+ module architecture, SQL Server backend, Windows thick-client heritage. Key finding: **no bulk export tool, no public API** — extraction only via report-to-CSV or direct SQL access. No migration-out tooling exists. ~5,000 words.

### [07 — Corridor-to-Athelon Migration Strategy](./07-corridor-to-athelon-migration-strategy.md)
Actionable migration strategy: field-by-field entity mapping against Athelon's Convex schema, 4-approach data extraction playbook (SQL queries, report exports, CSV templates, manual entry), automated import pipeline architecture, parallel running strategy, customer-facing migration guide draft, sales enablement scripts, and a 4-phase implementation roadmap (MVP in 4-6 weeks). ~8,000 words.

### [08 — Corridor User Intelligence](./08-corridor-user-intelligence.md)
Competitive intelligence from reviews, forums, and industry sources. Key findings: CAMP Connect integration is Corridor's deepest lock-in moat; top switch drivers are workflow rigidity, Crystal Reports bottlenecks, and feature gating; critical gaps Athelon can exploit include customer self-service portal, visual scheduling, and configurable approvals. FAA migration psychology is the main sales barrier — a documented, PMI-showable migration protocol is the top differentiator. ~5,000 words.

---

## Key Cross-Cutting Themes

1. **Migration is a product feature, not a one-time project** — Build migration infrastructure as a first-class subsystem, not a bolt-on script
2. **Fork the onboarding flow early** — "Coming from a competitor" and "starting fresh" are fundamentally different journeys; don't conflate them
3. **FAA records are legally distinct from business data** — Paper logbooks remain the primary legal record; digital migration creates operational convenience, not legal replacement
4. **Progressive data collection beats upfront demands** — Minimum viable data to get started (tail number + make + model), then collect more through normal workflow usage
5. **White-glove migration is a sales weapon** — Free migration services for mid-market+ customers improve 6-month retention by 40-60%
6. **Corridor importer is the highest-ROI first investment** — Most common Part 145 competitor; no export tooling exists (first-mover opportunity for Athelon)
7. **CAMP Connect integration is Corridor's deepest moat** — Shops whose customers use CAMP for airworthiness tracking face the hardest migration; plan for CAMP data bridging
8. **FAA migration psychology is the #1 sales barrier** — A documented, PMI-showable migration protocol is the single most effective differentiator
9. **Migrated data must carry provenance metadata** — Every migrated record needs source system ID, migration confidence score, and verification status

## Recommended Reading Order

- Start with **05** (MRO specifics) if you need to understand the regulatory constraints first
- Start with **01** (best practices) + **02** (competitor migration) for general SaaS migration strategy
- Read **03** (unstructured data) for the small paper-shop onboarding challenge
- Read **04** (technical architecture) last — it's the implementation layer that builds on the strategic foundation
- For Corridor-specific work, read **06** → **08** → **07** (product intel → user intelligence → migration strategy)
