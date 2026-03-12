# Competitor Migration Onboarding: B2B SaaS Research Corpus

**Research Area:** How leading B2B SaaS companies handle onboarding customers migrating from competitor products
**Date:** 2026-03-12
**Applicability:** Athelon MRO platform — migrations from Corridor, CAMP, ATP FlightDocs, Quantum MX, and paper-based systems

---

## Table of Contents

1. [Competitor Intelligence for Migration](#1-competitor-intelligence-for-migration)
2. [Migration-Focused Onboarding Flows](#2-migration-focused-onboarding-flows)
3. [White-Glove vs. Self-Service Migration](#3-white-glove-vs-self-service-migration)
4. [Data Import UX Patterns](#4-data-import-ux-patterns)
5. [Competitive Switching Campaigns](#5-competitive-switching-campaigns)
6. [Transition Period Management](#6-transition-period-management)
7. [Success Metrics](#7-success-metrics)
8. [Common Pitfalls](#8-common-pitfalls)
9. [MRO-Specific Considerations](#9-mro-specific-considerations)
10. [Recommendations for Athelon](#10-recommendations-for-athelon)

---

## 1. Competitor Intelligence for Migration

### Why Competitor Data Models Matter

When a customer migrates from a competitor, they arrive with mental models, terminology, and workflows shaped entirely by their previous system. The switching cost is not just technical — it's cognitive. The software company that best understands the outgoing system reduces friction at every step: import tooling, field mapping, help documentation, and live support conversations all become more effective when they reflect accurate competitor knowledge.

The most sophisticated SaaS companies treat competitor schema knowledge as a first-class internal asset, maintained alongside their own product docs.

### Building "Migration from X" Playbooks

A migration playbook is an internal document (sometimes customer-facing) that captures:

- **The competitor's core entities and their Athelon equivalents** (e.g., Corridor "Work Order" → Athelon Work Order; Corridor "Defect Card" → Athelon Discrepancy/Task Card)
- **Fields that map cleanly** vs. **fields that require transformation** vs. **fields with no equivalent**
- **Data that is typically dirty in exports from that system** — known quality issues in CSV/XML exports, date format inconsistencies, truncated text fields, relational data that gets flattened
- **Common customer pain points with the outgoing system** — what they hated, what they'll miss, what they expect to be better
- **Workflow differences** — sequences of steps that differ enough to confuse users who have muscle memory from the old system
- **A support escalation path** — which edge cases require a human, who owns those cases

HubSpot maintains internal "competitive battle cards" that double as migration guides for their CSM team. When a prospect says "we're coming from Salesforce," the onboarding team has a dedicated 12-step checklist that accounts for Salesforce's object model (Accounts → Contacts → Deals → Activities) and how each maps into HubSpot's contact-company-deal-activity hierarchy.

### Maintaining a Competitor Schema Knowledge Base

Schema knowledge degrades. Competitor products release updates, rename fields, change export formats. Best practices:

- **Assign ownership.** One person or team owns each competitor playbook and is responsible for keeping it current. At mid-stage SaaS companies this is typically a Solutions Engineer or a dedicated Migrations team member.
- **Version the playbooks.** When Corridor releases a new export format or renames a field, the playbook version is incremented and impacted customers are identified.
- **Source from real exports.** Request anonymized export samples from customers during sales/onboarding. These are more accurate than documentation the competitor publishes.
- **Customer interview feedback loop.** After every completed migration, capture: "What was confusing? What mapping surprised you? What data didn't come over as expected?" Feed this back into the playbook.
- **Monitor competitor release notes.** Assign someone to track competitor changelogs, release notes, and community forums for schema or export format changes.

### MRO-Specific Competitor Intelligence

For Athelon, the relevant competitor universe includes:

| Competitor | Primary Customer Type | Export Capabilities | Known Schema Characteristics |
|---|---|---|---|
| Corridor MX | FAA Part 145 repair stations | CSV export, PDF reports | Work Orders, Defect Cards, Parts Transactions; date fields in M/D/YYYY; no native API |
| CAMP Systems | Part 91/135 operators, MROs | PDF compliance reports, limited CSV | Strong AD/maintenance tracking; aircraft-centric not shop-centric |
| ATP FlightDocs | Part 91/135/145 | CSV export per module | Modular: Maintenance Tracking, Discrepancy, Work Orders are separate modules with separate exports |
| Quantum MX | Smaller Part 145 shops | CSV/Excel export | Simpler schema; technician time tracking tightly coupled to work orders |
| Paper / Excel | Small shops, GA operators | Manual data entry, scanned PDFs | No structured export; historical records are physical documents per FAA requirement |

---

## 2. Migration-Focused Onboarding Flows

### The Core Insight: "Coming From X" is a Different Product Experience

A net-new customer onboarding flow is designed to teach concepts from scratch. A migration onboarding flow must do something harder: it must acknowledge what the customer already knows, respect their existing mental model, map their institutional knowledge onto the new system's model, and surface only the genuine differences.

Conflating these two flows is one of the most common onboarding mistakes in B2B SaaS. A migrating customer who is walked through "what is a work order?" will feel condescended to. A net-new customer who is asked to map fields from a system they've never used will be confused and anxious.

The fork should happen early — ideally at the onboarding intake or the first product touch — with a simple question: "Are you switching from another system, or is this your first dedicated [work order / maintenance tracking / CRM] tool?"

### Industry Examples

#### HubSpot — Migrating from Salesforce

HubSpot's Salesforce migration path is the most mature example in the B2B SaaS industry. Key elements:

- **Dedicated migration landing page** that uses Salesforce terminology ("Leads," "Opportunities," "Campaigns") and maps them explicitly to HubSpot equivalents
- **Salesforce-to-HubSpot field mapping guide** published in the knowledge base, updated with each Salesforce release
- **HubSpot Import Tool** accepts Salesforce CSV exports natively; the column header detection logic is pre-tuned to common Salesforce export column names
- **Dedicated "Salesforce migration" onboarding track** within HubSpot Academy — separate from the standard onboarding courses
- **CSM escalation path** for customers with >10k records, complex Salesforce customizations, or multiple Salesforce instances
- **"Bring your Salesforce data" guarantee** — HubSpot's sales team uses the quality and ease of the migration as a closing argument
- **Post-migration check-in at day 14** specifically focused on data completeness, not feature adoption

The explicit acknowledgment that "you know Salesforce, here's how that maps" shortens time-to-confidence dramatically compared to generic onboarding.

#### Notion — Migrating from Confluence

Confluence-to-Notion is a content/knowledge base migration with a different character: the data is largely unstructured (wiki pages), so the migration is less about schema mapping and more about hierarchy, permissions, and workflow.

- **Notion's approach:** Direct import from Confluence (via API token) that attempts to preserve page hierarchy, inline images, and links
- **The honest limitation:** Confluence macros (Jira tickets, status badges, custom macros) have no Notion equivalent; Notion communicates this upfront in the import flow rather than silently dropping data
- **Confluence-specific documentation:** Notion maintains docs titled "For Confluence users" that translate Confluence concepts (Spaces, Pages, Macros, Templates) to Notion equivalents (Workspaces, Pages, Blocks, Templates)
- **Team-by-team migration guidance:** Notion explicitly recommends migrating one team at a time, starting with the least critical content, before migrating core knowledge base content
- **"Start fresh vs. import" framing:** Notion's onboarding asks whether the customer wants to start a clean Notion workspace or migrate existing Confluence content — and gives genuine, opinionated guidance on when each is better

#### Asana — Migrating from Jira

Asana's Jira migration is instructive because the two tools have genuinely different paradigms (task-list vs. issue tracker), which creates real cognitive friction.

- **Asana's Jira CSV importer** maps Epic/Story/Task hierarchy into Asana Sections/Tasks/Subtasks
- **Explicit paradigm translation:** Asana publishes "Asana for Jira users" guides that address conceptual differences head-on — Jira Sprints become Asana Timeline milestones; Jira Labels become Asana Custom Fields; Jira Statuses become Asana Task completion states
- **What Asana doesn't try to replicate:** Jira's issue type hierarchy and workflow automation are not replicated; Asana is honest that if your team's workflows are deeply Jira-native (complex state machines, scripted automations), the transition requires workflow redesign, not just data migration
- **Migration calculator:** Asana offers a "how long will your migration take?" estimate based on number of projects, team size, and data volume
- **30-day parallel run recommendation:** Asana explicitly recommends keeping Jira open for 30 days after migration go-live, with a defined sunset date for Jira

#### Linear — Migrating from Jira

Linear's approach to Jira migration is philosophically different from Asana's — Linear doesn't try to replicate Jira's complexity; it positions itself as the deliberate simplification of it.

- **Jira importer** maps Issues, Projects, Epics, and Comments; deliberately does not import Jira's custom workflow states (treats this as an opportunity to reset to Linear's opinionated workflow)
- **Tone of the migration docs:** Linear's migration documentation is written with the explicit framing "Jira can do almost anything; Linear does one thing very well." This manages expectations about what will and won't transfer.
- **Lost features as features:** Linear proactively tells migrating customers which Jira features don't exist in Linear and why this is intentional. This prevents the "where did X go?" frustration that often derails migrations.
- **Import preview before commit:** Linear's import flow shows a sample of what the imported data will look like before the user commits to the full import
- **Per-project migration:** Large Jira instances are migrated project-by-project, not all at once

#### Slack — Migrating from Microsoft Teams

Slack's Teams migration is the most enterprise-scale example, involving not just data migration but organizational change management.

- **Slack's "From Microsoft Teams" guide** is a full change management playbook — it covers communication rollout, executive sponsorship, training plan templates, and a 4-week migration timeline
- **No data migration from Teams:** Slack explicitly does not offer Teams chat history import. The rationale published: "Starting fresh removes the noise and lets your team establish healthier communication habits." This is a deliberate product decision that manages expectations rather than overpromising.
- **Terminology translation:** Slack maintains a published glossary — "Teams Channels = Slack Channels; Teams Chats = Slack DMs; Teams Teams = Slack Workspaces/Channels" — with explicit caveats where the mapping isn't 1:1
- **IT admin migration track vs. end-user track:** Slack's migration onboarding has completely separate flows for IT admins (SSO configuration, data governance, permission mapping) and end users (where to find things, how to use Slack)
- **Adoption metrics dashboard:** Post-migration, Slack's enterprise success team monitors active user percentage, messages per user per day, and channel creation rate as leading indicators of whether the migration "stuck"

### Common Thread Across All Examples

Every successful migration-focused onboarding flow shares these properties:
1. It acknowledges the outgoing system by name and uses its terminology
2. It publishes an explicit concept-to-concept mapping
3. It is honest about what will and won't transfer
4. It separates the technical migration (data import) from the workflow migration (learning the new way)
5. It has a defined completion state — the customer knows when migration is "done"

---

## 3. White-Glove vs. Self-Service Migration

### Segmentation Framework

The decision of how much human assistance to provide in a migration is primarily a function of customer size, data complexity, and strategic value — not the customer's technical sophistication.

| Segment | Typical Criteria | Recommended Approach |
|---|---|---|
| SMB / low ACV | <10 users, <5k records, single location | Self-service with guided wizard + async support |
| Mid-market | 10–100 users, 5k–50k records, 1–3 locations | Structured self-service + onboarding call + CSM check-ins |
| Enterprise / high ACV | 100+ users, 50k+ records, complex data, regulatory constraints | White-glove: dedicated migration engineer, phased plan, formal sign-off |
| Strategic / named accounts | Any size if the logo has outsized marketing/reference value | White-glove regardless of technical complexity |

For MRO context specifically: shop size (number of mechanics, number of active work orders, number of tail numbers in fleet) is a better proxy than pure record count, because FAA compliance history adds a regulatory dimension that elevates the stakes for any shop migrating historical records.

### Self-Service Migration

Best when:
- Data volume is manageable (<10k records)
- The source system has a clean, well-documented export format
- The customer's data is relatively clean (few duplicates, consistent formatting)
- The customer has a technical champion internally who can own the process

Design requirements for effective self-service migration:
- Step-by-step wizard with clear progress indication and a "save and resume" capability (migrations rarely complete in one sitting)
- Template downloads for each source system (pre-formatted CSV templates that match what the source system exports)
- Inline validation with specific, actionable error messages
- Preview of mapped data before commit
- Rollback capability for at least 30 days post-import
- Async support channel (email or in-app) with <4hr response time SLA during migration window

### White-Glove Migration

Best when:
- Data volume is large (>50k records)
- Source data requires transformation (multiple source systems, inconsistent formats, legacy paper-converted-to-digital data)
- FAA compliance history must be preserved with audit trail
- Customer has low technical capacity internally
- The migration failure risk is commercially unacceptable (e.g., the customer can't afford 2 weeks of disruption)

Design requirements for effective white-glove migration:
- Dedicated migration engineer assigned pre-contract (not post-signature)
- Discovery call to audit source data quality before quoting the migration
- Written migration plan with timeline, milestones, and acceptance criteria
- Staging environment where the customer can validate migrated data before go-live
- Formal sign-off process (customer approves migration before production cut-over)
- Post-go-live "migration warranty" period (typically 30–90 days) where data issues are fixed at no charge
- Escalation path to engineering if the importer encounters data it can't handle

### Hybrid Approaches

Most mature SaaS companies offer a hybrid: self-service tooling for straightforward data, plus a white-glove overlay for complex data or high-value customers.

**HubSpot's model:** Free self-service import for all customers. Paid "Migration Service" add-on (flat fee, typically $500–$3,000) for customers who want a HubSpot migration specialist to do the work. The self-service tool is good enough that SMBs rarely need the paid service; enterprise customers almost always buy it.

**Linear's model:** Self-service import only; no paid migration service. Linear's product philosophy is that if the self-service import can't handle your data, your data is too complex for Linear's current maturity level. This is a defensible position for a product-led-growth company that self-selects for technically sophisticated teams.

**Salesforce's model (for incoming migrations):** White-glove only, delivered via Salesforce Professional Services or certified SI partners. No self-service migration tooling. This is viable when your ACV is $50k+ but would be a conversion killer at lower price points.

### Cost/Benefit Analysis

White-glove migration costs:
- Staff time: 10–40 hours of migration engineer time per customer depending on complexity
- At a fully-loaded cost of $100–150/hr, this is $1,000–$6,000 per migration
- For customers with ACV < $5k, white-glove is economically inviable unless bundled into a one-time setup fee

White-glove migration benefits:
- 40–60% higher 6-month retention vs. self-service (based on HubSpot internal data, published in growth case studies)
- Higher initial data completeness → higher early product engagement → lower churn probability
- Reference value: customers who had a great migration experience are significantly more likely to become reference customers
- Reduced support burden post-launch (data issues discovered and fixed during migration rather than trickling in as support tickets for months)

---

## 4. Data Import UX Patterns

### File Upload Wizards

The most common data migration UX pattern for SMB/mid-market. Best practices observed across HubSpot, Asana, Airtable, and others:

**Step 1 — Source Selection**
- Ask "What system are you migrating from?" before showing upload UI
- Offer named source options (Competitor A, Competitor B, Excel/CSV, Other) to trigger appropriate column-mapping presets
- Show a link to a guide for getting your data out of the selected system

**Step 2 — File Upload**
- Accept CSV, XLSX, and XML at minimum; consider JSON for technical users
- Show maximum file size clearly (and make it generous — 50MB minimum for enterprise data volumes)
- Provide a downloadable template for each source system
- Validate file format before attempting parse; give immediate, specific error on invalid files

**Step 3 — Column Mapping**
- Auto-map columns using name-matching heuristics (case-insensitive, fuzzy matching)
- Show confidence scores on auto-mappings so users can spot likely errors
- Clearly mark required fields
- Allow users to skip columns (mark as "do not import")
- Provide in-context help explaining what each target field means and what format it expects
- Save mapping profiles so repeat importers don't re-map every time

**Step 4 — Data Preview**
- Show the first N rows of mapped data in a table view
- Highlight cells that failed validation in red with hover-tooltip explanation
- Show a count: "X records will be imported, Y records have errors, Z records will be skipped"
- Give users the option to download a report of errors before committing

**Step 5 — Import Execution**
- Run large imports asynchronously (background job); never block the UI on a long import
- Show a real-time progress bar with estimated time remaining
- Email notification when import completes or fails
- Allow the user to continue using the app while import runs

**Step 6 — Import Results**
- Summary screen: records imported successfully, records skipped, errors encountered
- Downloadable error report (CSV of rows that failed with error descriptions)
- Link to the imported data immediately so users can validate
- "Undo this import" button (soft-delete, not hard delete) available for at least 7 days

### Field Mapping Interfaces

Field mapping is the highest-cognitive-load step in a migration UX. Design goals:

- **Minimize the number of decisions.** Auto-map everything possible; only ask the user to make decisions where ambiguity genuinely exists.
- **Use source terminology.** Display source column names in the customer's own words (from their export); don't rename them in the mapping UI.
- **Show sample data.** Next to each source column in the mapper, show 2–3 sample values from the actual uploaded file. This helps users verify they're mapping the right column (especially when column names are cryptic).
- **Progressive disclosure.** Hide advanced/optional field mappings behind an "Advanced" toggle; don't overwhelm users with 50 fields when 10 are required.
- **Validation inline.** If a mapped field has format requirements (date format, phone number format, numeric range), validate on the sample data immediately in the mapping UI. Don't wait for the full import to surface format errors.

### Progress Indicators

For large imports, accurate progress communication is critical to user confidence:

- Show both percentage complete and records processed (e.g., "47% — 23,450 of 50,000 records processed")
- Show estimated time remaining, but acknowledge the estimate may shift
- Log discrete milestones ("Validating schema... Importing work orders... Updating indexes...") so users understand what the system is doing
- If an import will take more than 5 minutes, proactively offer to email the user when it's done and release them from watching the progress screen

### Error Handling UX

Error handling is where migrations succeed or fail from a UX perspective. The worst pattern: a generic "Import failed" message after a 20-minute wait.

Best practices:
- **Categorize errors by severity.** Fatal errors (invalid file, missing required fields on every row) stop the import. Row-level errors (5% of rows have a missing value) should not stop the import; import the valid rows and report the failed rows.
- **Partial import recovery.** After a partial import, the user should be able to download a CSV of only the failed rows, fix them, and re-import without re-importing the already-successful rows.
- **Specific error messages.** "Row 47: 'aircraft_registration' value 'N12345X' does not match a tail number in your fleet. Import this row without aircraft association or skip it?" is infinitely better than "Invalid value in row 47."
- **Error grouping.** If 500 rows fail for the same reason, report it as "500 rows: missing technician assignment" rather than 500 individual error lines.
- **"Fix and retry" UX.** Provide a clear path from the error report back into a corrected re-import, pre-populating as much as possible from the previous attempt.

### MRO-Specific Import Considerations

Aviation maintenance records have unique characteristics that affect import UX design:

- **Tail number validation.** Every maintenance record should be associated with a registered aircraft. Athelon should validate N-numbers (and ICAO registration marks for international aircraft) against its fleet database during import; records with unrecognized tail numbers need explicit handling.
- **Date/time handling.** Maintenance record dates are legally significant. Import tooling must handle timezone ambiguity explicitly — ask the user what timezone their source data uses; do not assume.
- **Technician certificate numbers.** Work sign-offs reference FAA mechanic certificate numbers (A&P, IA). When importing historical sign-offs, the certificate number is the authoritative identifier, not the technician's name (which may have changed).
- **Work order status transitions.** Importing closed/historical work orders is different from importing open/active work orders. The import flow should distinguish these and handle them appropriately (historical records are read-only references; active records may need action).

---

## 5. Competitive Switching Campaigns

### "Switch from X" Landing Pages

Dedicated competitor switching landing pages are among the highest-converting pages in B2B SaaS marketing. Examples:

**HubSpot vs. Salesforce:** HubSpot maintains `hubspot.com/compare/salesforce` — a full-length landing page that uses Salesforce's terminology, acknowledges what Salesforce does well, positions HubSpot's tradeoffs honestly, and includes a prominent "Free migration from Salesforce" CTA. Conversion rates on competitor comparison pages are typically 3–5x higher than generic product pages because visitors have high purchase intent.

**Notion vs. Confluence:** Notion's comparison pages highlight ease of use, pricing transparency, and migration support as key differentiators. They include testimonials specifically from teams that switched from Confluence.

**Linear vs. Jira:** Linear's `linear.app/compare/jira` page is deliberately minimal — two columns, honest about tradeoffs, with a "Try Linear free" CTA that leads directly into the Jira importer.

Design elements that improve competitor switching page conversion:
- Use the competitor's name prominently (SEO benefit + relevance signal)
- Side-by-side feature comparison table (honest, not padded)
- Testimonials from companies that switched from that specific competitor
- Specific migration CTA (not generic "start free trial" — "Import your [Competitor] data in 15 minutes")
- Pricing comparison if your pricing is meaningfully more favorable
- Migration guarantee or free migration service as the primary risk-reduction offer

### Migration Guarantees

A migration guarantee is a commitment that the vendor will ensure successful data migration or provide remediation. Examples:

- **"Your data or your money back"** — if the migration fails and can't be remedied within X days, full refund
- **"Free migration or your first month free"** — if migration takes longer than promised, the delay period is free
- **"Migration complete or we extend your trial"** — trial clock doesn't start until data is successfully migrated and validated
- **Data completeness guarantee** — vendor commits to achieving a specific percentage of records successfully imported

Migration guarantees work as sales tools because they shift the risk perception — the customer no longer fears being stranded mid-migration with no data in either system.

### Free Migration Services as Sales Tools

Offering free white-glove migration is one of the most effective closing tools for competitive displacement, particularly for mid-market accounts.

Economics: A free migration service that costs $2,000–$4,000 to deliver (in staff time) that closes a $20,000 ACV deal represents excellent ROI. The migration service also dramatically improves retention — a customer whose migration was done correctly by you is significantly less likely to churn in year 1.

Positioning: Frame free migration not as a concession but as a risk-removal service. "We do the migration for you, at no cost, because we're confident in the outcome and we want you to start on the right foot" is more compelling than "we'll waive the migration fee as a discount."

### Migration SLAs

Publishing specific time commitments for migration builds confidence:
- "Self-service import: data available within 2 hours of upload"
- "Guided migration: kick-off call within 3 business days of contract signature"
- "White-glove migration: go-live within 30 days of contract signature"
- "Historical data validation: complete within 5 business days of go-live"

SLAs also create internal accountability — teams with published SLAs build better tooling and processes than teams without.

---

## 6. Transition Period Management

### Running Old and New Systems in Parallel

The parallel run is standard practice for enterprise migrations. The customer operates both systems simultaneously for a defined period (typically 30–90 days), with the old system as "system of record" until a defined cut-over date.

Parallel run design principles:
- **Define the cut-over date at the start of the parallel run, not at the end.** Open-ended parallel runs extend indefinitely ("we'll cut over when we're comfortable") and signal to users that the old system is still valid, creating permanent dual-system cognitive overhead.
- **Designate one system as the system of record for new data.** During a parallel run, new work orders should be created in the new system even if the old system remains open for reference. Do not create data in both systems — it creates reconciliation problems.
- **Plan for read-only access to the old system post-cut-over.** Users often need to reference historical data in the old system's native format (especially true for aviation maintenance records). Negotiate read-only access to the outgoing system for at least 6 months post-cut-over.

### Gradual Team Migration

Migrating the entire organization simultaneously creates massive support demand and high failure risk. Best practice is a phased rollout by team, role, or workflow.

HubSpot's recommended Salesforce migration sequence:
1. Migrate SDR/BDR team first (smallest dataset, highest adoption motivation)
2. Migrate marketing ops (isolated workflows, less dependent on sales data)
3. Migrate account executives (largest dataset, highest resistance, most dependent on data quality)
4. Migrate sales management/reporting last (after data quality is validated by the first three groups)

For Athelon / MRO context:
1. Migrate administrative/billing functions first (invoice history, vendor records — lower operational risk)
2. Migrate open/active work orders during a low-traffic period
3. Migrate historical maintenance records last (most volume, highest regulatory stakes, can be done without operational disruption)
4. Cut over FAA-required recordkeeping last, after all operational functions are validated

### Training During Transition

Timing training relative to migration go-live matters significantly. Training too early (weeks before go-live) means users have forgotten by the time they need the skills. Training too late (after go-live) means users struggle during initial adoption and build bad habits.

Best practice: Training delivered in two phases:
1. **Pre-go-live orientation** (1 week before) — conceptual overview, navigation, key workflow differences from the old system. Intentionally short (30–60 min). Goal: eliminate first-day surprise.
2. **Post-go-live hands-on training** (day 1–5 after go-live) — role-specific, using the customer's actual data. Goal: build confidence on real tasks.

Role-based training is significantly more effective than all-hands training. A technician's daily workflow in a maintenance system is entirely different from a shop manager's workflow; training that covers both in one session serves neither well.

### Handling Users Who Resist Change

Resistance to migration is normal and should be anticipated in the migration plan, not treated as a surprise.

**Sources of resistance in MRO environments:**
- "I know exactly how to do this in [old system] — I've done it 10,000 times"
- "What if I make a mistake that causes an FAA compliance issue?"
- "The paper system always worked fine; this is just more IT overhead"
- Institutional memory in the old system (technicians know workarounds and shortcuts that aren't documented)

**Strategies that work:**
- **Identify and recruit internal champions.** Find 1–2 people in the organization who are enthusiastic about the new system and leverage them as peer advocates. Peer endorsement is more effective than vendor advocacy for resistant users.
- **Acknowledge the old system's strengths explicitly.** Saying "I know [old system] was reliable and you knew it well — here's how Athelon handles the same task" is disarming. Dismissing the old system creates defensiveness.
- **Make the new system easier for the specific tasks resistant users do most.** If a 20-year technician uses the system primarily to look up historical repair data and sign off work, make those two tasks as fast as possible in the new system. Optimization for high-frequency tasks converts skeptics faster than any other method.
- **Establish a feedback channel and act on it.** Resistant users often have legitimate product feedback. A visible feedback channel that results in visible product improvements converts resistance to advocacy.
- **Don't negotiate on the cut-over date.** The most common failure mode is allowing resistant users to continue using the old system indefinitely "until they're comfortable." This signals that the migration is optional. The cut-over date is a business decision, not a technical milestone.

---

## 7. Success Metrics

### Time-to-First-Value After Migration

Time-to-first-value (TTFV) for a migration customer is different from TTFV for a net-new customer. For a migration customer, "first value" is not "first work order created" — the customer has been creating work orders for years. First value in a migration context means:

- **"I completed a task in the new system faster than I would have in the old system"** — the moment the new system demonstrates net positive productivity vs. the incumbent
- **"My data is here and I trust it"** — the moment the customer has confidence that their historical records are complete and accurate in the new system
- **"I found something in the new system that I couldn't do in the old system"** — the first net-new capability moment

Target benchmarks (based on industry data across B2B SaaS):
- Self-service migration TTFV: 3–7 days after import completion
- White-glove migration TTFV: 7–14 days after go-live
- Paper-based system migration TTFV: 14–30 days (longer because users are building new habits, not just changing systems)

### Data Completeness Scores

A data completeness score measures how much of the customer's intended historical data was successfully imported and is accessible in the new system.

Measuring data completeness:
- **Record count parity:** Customer's source record count vs. imported record count. Target: >99% of records imported.
- **Field completeness:** Percentage of imported records with all required fields populated. Target: >95%.
- **Relational integrity:** Percentage of relationships (e.g., work orders associated with a specific tail number, tasks associated with a work order) that are intact after migration. Target: >98%.
- **Attachment completeness:** Percentage of documents/attachments that migrated successfully vs. source system count. This is often the hardest metric to achieve; 90% is a realistic target.

Data completeness should be measured and reported to the customer as a formal post-migration deliverable, not just an internal metric.

### User Adoption Curves Post-Migration

Expected adoption curve for a migration customer (based on Slack, HubSpot, and Asana post-migration data):

- **Days 1–7:** Daily active users (DAU) at 30–50% of total licensed users. Many users are still oriented to the old system or in parallel-run mode.
- **Days 8–30:** DAU climbs to 60–75% as the parallel-run period ends and users are pushed to the new system.
- **Days 31–60:** DAU stabilizes at 70–85% for healthy migrations. Persistent laggards (the 15–30%) are either inactive users who weren't active in the old system either, or holdout resisters who need targeted intervention.
- **Days 61–90:** Healthy migration target: 85%+ DAU of licensed users. If below 70% at day 90, the migration is at risk of churning.

For MRO specifically: "daily active" may be less relevant than "work-order-active" — measuring whether work orders are being opened and closed in the new system at the expected rate is a more meaningful proxy than raw login counts.

### Churn Risk Indicators During Migration

Leading indicators that a migration customer is at churn risk:
- Import completed but no work orders created in the new system within 14 days
- Support ticket volume >3x the post-migration average (data quality issues eroding confidence)
- User returning to the old system for active tasks (not just historical reference) past the 30-day mark
- Customer champion (the internal sponsor of the migration) leaves the company
- Data completeness score below 85% at the end of the import phase
- No management-level user has logged in within the first 30 days

Churn risk during migration is significantly higher than steady-state churn. Migration customers who are not proactively managed are 2–3x more likely to churn in year 1 than customers who started on the new system fresh.

---

## 8. Common Pitfalls

### Data That Doesn't Map Cleanly

Every migration encounters data that doesn't map 1:1 between systems. Common sources of unmappable data:

**Custom fields without equivalents.** The outgoing system may have custom fields built over years of configuration. If the new system doesn't support the same level of customization, this data has no home. Best practice: identify all custom fields in the source system during discovery and have a documented decision for each (map to custom field in new system, map to notes/description, drop with customer acknowledgment, or request new system feature).

**Workflow states without equivalents.** An outgoing system may have 8 work order statuses; the new system may have 4. The migration must define a mapping (which 8 statuses collapse to which 4?) and get customer sign-off.

**Relational data that was denormalized.** Many legacy MRO systems store technician names as free text rather than foreign keys. When a technician's name appears differently in different records ("J. Smith," "John Smith," "John A. Smith"), automated mapping fails. This is among the most time-consuming cleanup tasks in a migration.

**Attachments and documents.** File attachments are often stored in ways that are difficult to export programmatically (file system paths that are no longer valid, blob storage with no export API, PDFs that are actually scanned images with no metadata). Plan for 10–20% of attachments to require manual remediation.

**Date/time inconsistencies.** Mixed date formats (MM/DD/YYYY vs. YYYY-MM-DD), missing timezone information, and dates stored as text rather than typed date fields are extremely common in legacy systems. For aviation maintenance records where date precision is legally significant, these errors are unacceptable and must be caught before import.

### Workflow Differences That Frustrate Migrating Users

The most common post-migration frustration is not missing data — it's missing workflows. Users know their job; they don't know how to do their job in the new system.

Examples specific to MRO workflow migration:
- **Sign-off workflow:** Some systems have a two-click sign-off; others require a multi-step conformity check. Users accustomed to the faster workflow find the more rigorous one frustrating, even if it's the correct one from a compliance standpoint.
- **Parts lookup:** If the outgoing system integrated directly with the shop's parts inventory and the new system requires a separate lookup step, technicians experience this as a regression even if the new system's parts tracking is more accurate.
- **Time tracking:** Some systems capture technician time implicitly (start/stop work order = time tracked); others require explicit time entry. The change in workflow pattern is disorienting.
- **Report generation:** Managers who have memorized the 3-click path to their weekly report in the old system face a learning curve in the new system, even if the new report is more informative.

Mitigation: For each workflow that is materially different in the new system, provide a dedicated workflow guide ("How to do [task] in Athelon if you're used to [old system]"), not just generic feature documentation.

### Expectation Management

The most common cause of migration failure is not technical — it's a gap between what the customer expected and what the migration delivered.

Common expectation mismatches:
- **"Migration" interpreted as "transformation."** Some customers expect the new system to fix data quality problems that exist in their source data. It will not; it imports what's there. Set expectations explicitly: "We will accurately import the data in your source system; we will not clean, deduplicate, or correct your source data as part of the standard migration."
- **"All my data" vs. "all your exportable data."** Many legacy systems have data that cannot be programmatically exported — data locked in PDF reports, in email attachments, in a separate archival system. Customers assume "all their data" will be in the new system; the reality is "all the data that could be exported from the old system."
- **Feature parity expectations.** Customers frequently assume the new system does everything the old system did, plus more. In many cases, the new system doesn't replicate specific features of the old system (often intentionally). These feature gaps should be disclosed before contract signature, not discovered during migration.
- **Timeline expectations.** Migrations almost always take longer than the customer expects. Build in explicit buffer (20–30% longer than the engineering estimate) and communicate the padded timeline to the customer.

### Feature Parity Gaps

Feature parity gaps are places where the new system lacks functionality the customer used in the old system. They are the single most frequent cause of post-migration churn and should be treated as a sales/product risk, not just a support issue.

Best practice for handling feature parity gaps:
- **Discovery call as a gap analysis.** Before contract signature, conduct a structured feature-by-feature review against the customer's current system. Document gaps.
- **Gap prioritization.** For each identified gap: is it a "nice to have" or a workflow blocker? Workflow blockers must be resolved before migration (via product feature, configuration, or workaround); nice-to-haves can be on the roadmap.
- **Written gap acknowledgment.** For any accepted gap, get written customer acknowledgment ("we understand Athelon does not currently support [X]; we accept this as a known limitation and plan to use [workaround] in the interim"). This prevents post-migration surprise and dispute.
- **Roadmap commitments carefully.** Do not promise features on a roadmap timeline unless you are highly confident in delivery. A failed roadmap commitment in the context of a migration converts an accepted gap into a churn driver.

---

## 9. MRO-Specific Considerations

### FAA Recordkeeping Requirements and Migration Constraints

Aviation maintenance records are legally required documents. Their integrity, completeness, and accessibility are subject to FAA regulations. This creates constraints that do not exist in most B2B SaaS migrations.

**14 CFR Part 43, Appendix B — Records of Maintenance, Preventive Maintenance, Rebuilding, and Alteration**

Each record of maintenance, preventive maintenance, rebuilding, and alteration must include:
- A description (or reference to data acceptable to the FAA) of work performed
- The date of completion of the work performed
- The name of the person performing the work (if other than the person signing the record)
- The certificate number of the person approving the work for return to service

**Implications for migration:**
- Historical work records cannot be "summarized" or "aggregated" during migration; each discrete maintenance event must be preserved as a separate, complete record
- The approving technician's certificate number is the authoritative identifier, not the name
- The date of completion is legally significant and must be preserved exactly (not approximated or left null)
- Any transformation of historical records must be documented and auditable; the FAA can audit historical records at any time

**14 CFR 91.417 — Maintenance Records**

Operators are required to retain:
- Records of maintenance, preventive maintenance, alteration, and 100-hour and annual inspections — retained at least 1 year
- Records of current status of applicable AD compliance — retained until the work is repeated or superseded
- Records of overhaul and rebuilding of any airframe, engine, propeller, rotor, or appliance — retained as long as the aircraft is operated

**Implications for migration:**
- Historical records cannot be deleted or rendered inaccessible as part of a system migration
- Records must be exportable from the new system in a format that would satisfy an FAA audit
- The migration itself must not create a period where required records are inaccessible
- For records that are also on paper (original logbooks), the digital record is supplementary; the paper record remains the primary legal document

### Migrating from Paper-Based Systems

Paper-based maintenance records are the hardest migration case — and the most common for small GA shops and older Part 145 operations. Key considerations:

**What "migration" means for paper-based shops:**
- Historical records are in physical aircraft logbooks and shop maintenance records
- These records remain the legal documents of record; they do not get "migrated" into the digital system — they stay on paper
- The digital system starts fresh for all new maintenance activity
- Historical reference (when was the last 100-hour? what was the last AD compliance date?) must be manually entered as "starting status" records in the new system
- This is not a data migration — it is a configuration and setup process that includes manually entering current status information

**Key data to capture at digital go-live:**
- Current aircraft total time (TTAF) and time since overhaul (TSO/SMOH) for all major components
- Current AD compliance status (last compliance date and times, next due)
- Current calendar and hours-in-service limits for all recurring inspections
- Open discrepancies/MEL items
- Current aircraft equipment list

**What does NOT need to be entered digitally:**
- Complete maintenance history pre-go-live (the logbooks are the record)
- Historical parts installed (except as needed for current configuration and AD compliance)

### Migrating from CAMP Systems

CAMP is the dominant tracking system for Part 135 operators and high-utilization Part 91 operators. Key characteristics of CAMP data:

- **Aircraft-centric, not shop-centric.** CAMP organizes data around the aircraft and its components; Athelon organizes around work orders and their tasks. The migration must map component tracking in CAMP to task/work-order history in Athelon.
- **AD/SB compliance tracking.** CAMP's core value proposition is AD and Service Bulletin tracking. This is the most important data to preserve and validate in the migration.
- **Enrollment-based.** Aircraft are "enrolled" in CAMP; there is no concept of a shop's fleet in the same sense as Athelon. Operators using CAMP alongside a repair station may have enrollment in CAMP for tracking and a separate shop system for work orders.
- **Export limitations.** CAMP's export capabilities are limited; comprehensive data exports typically require engaging CAMP support and may take days to fulfill.

### Migrating from Corridor MX

Corridor is the most common full-featured MRO system for Part 145 repair stations. Key characteristics:

- **Work Order-centric.** Corridor's data model closely mirrors Athelon's, which makes field mapping more straightforward than CAMP migrations.
- **Export format.** Corridor exports via CSV or its built-in report generator. CSV exports are formatted for readability (merged cells in Excel, human-readable status labels) rather than machine parsing, which requires pre-processing before import.
- **Customer and aircraft records.** Corridor maintains separate Customer, Aircraft, and Work Order entities that must be imported in the correct sequence (Customers first, then Aircraft associated with customers, then Work Orders associated with aircraft).
- **Document attachments.** Documents attached to work orders in Corridor are stored in a local file system path that is specific to the customer's server installation; remote export of attachments requires manual retrieval or SQL-level access.

### Migrating from ATP FlightDocs

ATP FlightDocs is modular; customers may be using one or several modules. Key characteristics:

- **Separate module exports.** Maintenance Tracking, Work Orders, and Discrepancy Log are separate modules with separate data exports and separate schema. The migration must handle each module independently.
- **Aircraft maintenance program.** FlightDocs' maintenance program tracking (scheduled inspections, component time limits) is detailed and FAA-relevant; this data must be captured and validated against Athelon's inspection/compliance tracking before go-live.
- **User access model.** FlightDocs has a different role/permission model from Athelon; user permission mapping must be done carefully during migration setup.

---

## 10. Recommendations for Athelon

### Immediate Priorities (Pre-Launch)

**1. Build migration playbooks for the top 3 competitors before launching migration tooling.**
Priority order: (1) Corridor MX (most common Part 145 competitor), (2) paper/Excel (most common at initial customer acquisition), (3) ATP FlightDocs (growing presence). Each playbook should include the field mapping table, common data quality issues, and recommended migration sequence.

**2. Build a structured migration intake form.**
Before beginning any migration engagement, collect: source system and version; estimated record counts (work orders, aircraft, customers, technicians, documents); date range of historical records to migrate; any known data quality issues; FAA certificate type (Part 145, 135 operator, etc.); desired go-live date. This allows accurate scoping before committing resources.

**3. Define the self-service vs. white-glove threshold.**
Recommended initial segmentation:
- Self-service: paper/Excel migrations (fresh-start with current status entry), Corridor migrations with <500 work orders, first-year customers on lowest ACV tier
- White-glove: CAMP migrations (regulatory complexity), Corridor migrations with >500 work orders, any customer with active FAA audit in progress, enterprise accounts

**4. Design the import wizard for Corridor CSV format first.**
Corridor is the highest-value migration source. Building a Corridor-native importer (with column auto-mapping tuned to Corridor's export column names) will be a meaningful differentiator in competitive displacement deals against Corridor.

### Medium-Term Investments

**5. Build a "migration from competitor" onboarding track in the in-app onboarding flow.**
At the onboarding intake screen, ask: "Are you migrating from another system?" with named options (Corridor, CAMP, FlightDocs, Quantum, Paper/Excel, Other). Route migration customers into a dedicated onboarding track that uses the source system's terminology and provides explicit concept-mapping guidance.

**6. Invest in the field mapping UI as a premium feature, not an afterthought.**
The field mapping interface is where migrating customers form their first impression of Athelon's data model. A well-designed mapping UI signals product maturity. Key investments: source column name display, sample data in mapping UI, confidence scoring on auto-mappings, inline format validation.

**7. Develop a data completeness report as a formal migration deliverable.**
Post-migration, provide every customer with a signed-off Data Completeness Report: record counts, field completeness percentages, relational integrity scores, and any known gaps. For regulated aviation customers, this document provides assurance that the digital record matches the source system. It also creates a formal milestone for closing out the migration engagement.

**8. Create a "migration warranty" product policy.**
For white-glove migrations: data issues discovered within 90 days of go-live are resolved at no additional charge. Communicate this as a guarantee during the sales process. It reduces buyer anxiety and creates internal accountability for migration quality.

### FAA Compliance Considerations

**9. Never overwrite or delete historical records imported from a source system.**
Imported historical records should be stored as read-only reference records in Athelon's database. Updates to historical records (corrections, amendments) should create a new version with an audit trail, not modify the original. This preserves the integrity of the historical record for FAA audit purposes.

**10. Build an audit trail for the migration itself.**
The migration event should be logged: source system, date of migration, record counts, operator who authorized the migration, and the Athelon account that performed it. If an FAA inspector questions the completeness of historical records, the migration log provides a documented basis for the data lineage.

**11. Advise customers that paper logbooks remain the primary legal record.**
For customers migrating from paper-based systems, be explicit: the physical logbooks remain the FAA-required records. Athelon's digital records for historical maintenance are supplementary reference records; the logbooks must be retained in their physical form. This is not a limitation — it is the correct regulatory posture, and communicating it clearly prevents compliance misunderstandings post-migration.

**12. Validate AD compliance status at migration completion.**
For any migration that includes aircraft and AD compliance data, provide a post-migration AD compliance validation step: export the AD compliance status from the new system and ask the customer to compare against their source system's AD status report. Any discrepancies must be resolved before the customer relies on Athelon for AD compliance tracking. This is too high-stakes to leave to the customer to discover independently.

---

## Summary: Migration Onboarding Quality as a Competitive Advantage

In the MRO software market, the quality of a vendor's migration experience is a genuine competitive advantage, not just a hygiene factor. Aircraft maintenance shops have:

- Years of historical records with legal retention requirements
- Operational workflows they cannot afford to disrupt
- Staff who have built expertise around their current system
- Regulatory scrutiny that makes data quality errors consequential, not just inconvenient

A SaaS vendor that invests in competitor-specific migration playbooks, honest feature-gap documentation, FAA-compliant historical record handling, and proactive transition period management will win competitive displacement deals against vendors who treat migration as an afterthought.

The best migration experience leaves the customer feeling: "This was easier than I expected, my data is here, and I trust it." The worst migration experience leaves the customer feeling: "I didn't realize how much I was giving up." The difference is almost entirely in preparation, communication, and tooling investment — not in technical complexity.

---

*Document authored for Athelon product and GTM teams. Intended audience: Product Management, Customer Success, Sales Engineering, and Engineering leadership. See also: `docs/research/b2b-saas-onboarding/` for general onboarding research and `docs/research/b2b-buyer-evaluation/` for competitive evaluation patterns.*
