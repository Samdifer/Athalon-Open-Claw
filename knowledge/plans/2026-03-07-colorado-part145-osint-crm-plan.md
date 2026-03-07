# Colorado Part 145 OSINT CRM Program Plan
**Date:** 2026-03-07  
**Owner:** Jarvis  
**Purpose:** Build a repeatable, traceable research + product architecture for identifying and qualifying Colorado Part 145 repair stations as prospects inside Athelon.

---

## 1) Goal (what success looks like)
Create a system that:
1. discovers Colorado Part 145 repair stations from open sources,
2. enriches each prospect profile with operational attributes,
3. scores/segments them for outreach priority,
4. surfaces all of it in Athelon CRM with full source traceability,
5. preserves a research trail by team and by step.

Primary segmentation fields (requested):
- shop size
- aircraft they work on
- location relative to airport
- profile
- observability on the web (news/digital footprint)

---

## 2) Scope constraints (phase 1)
- Geography: **Colorado only** (pilot sample set)
- Entity type: **Part 145 repair stations**
- Method: **Open-source intelligence only** (no restricted scraping)
- Output destination: Athelon CRM (accounts + enrichment views)

---

## 3) Three-round research strategy (deep + iterative)

## Round 1 — Discovery & Baseline Registry
Objective: produce the most accurate Colorado Part 145 candidate list possible.

Key tasks:
- ingest official/public registry signals (FAA repair station references + state/business/open web directories)
- normalize legal name, doing-business-name, address, certificates, airport references
- dedupe by name/address/certificate patterns
- create baseline entity set with confidence labels

Outputs:
- `R1-entity-registry.csv`
- `R1-source-log.md`
- `R1-dedupe-decisions.md`

---

## Round 2 — Deep Enrichment & Classification
Objective: classify each candidate into actionable commercial profile categories.

Key tasks:
- enrich fleet/aircraft focus (airframe/engine/component/specialty indicators)
- infer shop size class (small/medium/large) from workforce/facility/public signals
- map airport proximity (distance to nearest airport + class)
- compute profile tags (e.g., avionics-focused, structures, turbine shop, mixed MRO)
- compute web observability score from:
  - website quality/coverage
  - news mentions recency
  - social and directory signals
  - contact discoverability

Outputs:
- `R2-enriched-profiles.csv`
- `R2-classification-rules.md`
- `R2-source-log.md`

---

## Round 3 — Validation, Edge Cases, and CRM-Ready Packaging
Objective: harden quality and make the dataset operational in Athelon.

Key tasks:
- edge-case review (multi-location entities, certificate ambiguity, name collisions)
- provenance check: every important field must map to a source record
- confidence scoring + manual-review queue generation
- produce CRM import packages and data contracts

Outputs:
- `R3-validated-prospects.csv`
- `R3-edge-case-matrix.md`
- `R3-import-contract.md`

---

## 4) Team orchestration model
Use parallel teams with clear responsibilities and traceability artifacts.

### Team A — Registry Discovery
- builds baseline candidate list
- owns dedupe logic v1

### Team B — Technical/Operational Enrichment
- aircraft/work-scope/shop-size/profile classification

### Team C — Geo + Airport Context
- airport linkage and distance metrics
- operational location context

### Team D — Web Observability Intelligence
- news/web footprint scoring
- visibility and digital maturity signals

### Team E — QA + Provenance + Packaging
- validates records, confidence, and source links
- outputs CRM-ready import bundle

---

## 5) Research traceability standard (mandatory)
For each team and round, save to:
`knowledge/research/crm-colorado-part145/round-{N}/team-{X}/`

Required files per team step:
1. `SOURCE-LOG.md` — source URLs, timestamps, extraction notes, confidence
2. `RAW-FINDINGS.jsonl` — normalized evidence snippets per entity
3. `TRANSFORM-NOTES.md` — normalization and classification decisions
4. `OUTPUT.csv` — team’s structured output
5. `ISSUES.md` — ambiguities, collisions, unresolved entities

Rule: **No field in final CRM dataset without provenance path** to `SOURCE-LOG` + raw evidence.

---

## 6) Data model proposal (Athelon CRM extension)

### New/extended account fields
- `regulatoryProfile.part145Status`
- `regulatoryProfile.certificateNumber`
- `regulatoryProfile.certificateConfidence`
- `shopProfile.sizeClass` (S/M/L + confidence)
- `shopProfile.aircraftFocus[]`
- `shopProfile.capabilityTags[]`
- `locationProfile.airportCodeNearest`
- `locationProfile.distanceToAirportNm`
- `locationProfile.locationType`
- `observability.score`
- `observability.newsMentions30d`
- `observability.webPresenceTier`
- `observability.lastObservedAt`
- `researchMeta.round`
- `researchMeta.team`
- `researchMeta.provenanceRefs[]`

### New related table suggestion
`prospectIntelligenceSnapshots`
- immutable snapshots per research pass
- enables historical comparison and auditability

---

## 7) In-app experience (where to display in Athelon)

Use existing CRM surface and add a dedicated prospecting area:

1. **CRM > Accounts**
- add “Part 145 Prospect” badges and quick filters
- sortable columns for shop size, aircraft focus, observability score

2. **CRM > Analytics**
- Colorado prospect funnel by segment
- map widgets: airport proximity vs score distribution

3. **New page: CRM > Prospect Intelligence**
- entity cards with:
  - profile summary
  - source-backed evidence panel
  - confidence + last-refresh
  - “promote to pipeline” action

4. **Account detail page enhancement**
- “Research Traceability” tab
  - source log links
  - snapshot timeline
  - unresolved issues flags

---

## 8) Classification framework (initial)

### Shop size (proxy-based)
- Small: low headcount/public footprint + narrow capability profile
- Medium: broader capability + moderate staffing/facility indicators
- Large: multi-location/high-volume/high-visibility indicators

### Aircraft worked on
- inferred from explicit capability statements and known work-scope evidence
- normalized into controlled vocabulary tags

### Airport relation
- nearest airport code
- distance bands (on-airport / near-airport / metro-remote)

### Profile archetypes
- avionics-centric
- airframe-heavy
- engine/component specialist
- mixed general MRO
- charter-support oriented

### Web observability score
Composite from:
- website completeness
- contact discoverability
- directory consistency
- recent news/activity
- digital ecosystem coverage

---

## 9) QA and governance controls
- confidence score per critical field
- collision queue for same-name/different-entity candidates
- required manual review on low-confidence certificate linkage
- immutable snapshots for every publish cycle
- anti-staleness policy (refresh cadence + stale flags)

---

## 10) Implementation phases in product

## Phase P1 (pilot, Colorado)
- ingest + enrichment + CRM display for Colorado only
- manual review loop active

## Phase P2 (automation hardening)
- scheduled refresh pipeline
- observability scoring stabilization
- automated issue routing

## Phase P3 (scale-out)
- expand to adjacent states/regions
- tuned segmentation by ICP and outreach strategy

---

## 11) Immediate execution plan (next action if approved)
1. Stand up folder structure + templates for traceability files.
2. Launch Round 1 teams (A/B/C in parallel, D/E after baseline).
3. Produce first Colorado baseline registry and confidence report.
4. Add CRM schema extension draft + UI wireframe stubs for Prospect Intelligence page.

---

## 12) Deliverables you will get at end of pilot
- Colorado Part 145 prospect dataset (validated)
- source-linked intelligence records per account
- CRM in-app prospect intelligence display
- prioritization list for outreach
- reproducible research/audit trail for every record
