# Sales Customer Research Flow — Master Reference

> End-to-end workflow for evaluating and learning about potential customers, from raw OSINT discovery through outreach readiness.

**Document type:** Process workflow (phase-gated checklist).
**Companion document:** [OSINT-METHODS-AND-SOURCES.md](OSINT-METHODS-AND-SOURCES.md) — the method catalog referenced by section number throughout this document.
**Reference implementation:** [crm-colorado-part145/](crm-colorado-part145/) — Colorado Part 145 program (71 prospects through all 5 phases).
**Sales framework:** [sales-corpus-hormozi/](sales-corpus-hormozi/) — Hormozi offer/value, playbooks, objection handling, and metrics systems.

---

## Table of Contents

1. [Phase 1 — Discovery](#phase-1--discovery)
2. [Phase 2 — Enrichment](#phase-2--enrichment)
3. [Phase 3 — QA and Packaging](#phase-3--qa-and-packaging)
4. [Phase 4 — Qualification Assessment (In-App)](#phase-4--qualification-assessment-in-app)
5. [Phase 5 — Outreach Preparation](#phase-5--outreach-preparation)
6. [Metrics and Progress Tracking](#6-metrics-and-progress-tracking)
7. [Repeatable Campaign Playbook](#7-repeatable-campaign-playbook)
8. [Integration with Hormozi Sales Framework](#8-integration-with-hormozi-sales-framework)

---

## Phase 1 — Discovery

**Goal:** Produce a raw candidate list from authoritative registry sources before any enrichment.

**Entry gate:** A target market or cert type is defined (e.g., "FAA Part 145 repair stations in Colorado").

### Steps

1. **Download FAA AVInfo CSV** — Filter by `State/Province = [STATE]` AND `Country = UNITED STATES`. See [OSINT Methods Section 1.1](OSINT-METHODS-AND-SOURCES.md#11-faa-avinfo-find-a-facility-part-145-primary-registry) for URL and filtering rules.

2. **Cross-reference secondary sources** — Check "Repair Station Contacts with Ratings XLSX" for additional cert tokens and contact data. See [OSINT Methods Section 1.2](OSINT-METHODS-AND-SOURCES.md#12-repair-station-contacts-with-ratings-xlsx).

3. **Normalize to target schema:**
   - `legal_name`, `dba_name`, `street`, `city`, `state`, `zip`
   - `cert_no`, `certificate_hints`
   - `phone`, `email`
   - `source_ref` (e.g., `FAA-AVINFO-DOWNLOAD-2026-03-07`)

4. **Deduplicate:**
   - Dedup exact duplicates on `(legal_name, street, zip, certificate_hints)`.
   - Same legal name + different cert numbers = distinct facilities — do NOT merge.
   - Apply `Country = UNITED STATES` filter to avoid international false positives.

5. **Assign baseline confidence:**
   - All records from official FAA source: `confidence = high`.
   - No enrichment at this stage — `website`, `shop_size_class`, `observability_score` all left blank.

6. **Aircraft ownership cross-reference** *(optional, not yet validated in a campaign)* — Download FAA Releasable Aircraft Database (`faa.gov/.../releasable_aircraft_download`). Cross-reference registered owner names against the Part 145 candidate list to identify repair stations that also own/operate aircraft (strong self-maintenance signal). See [OSINT Methods Section 1.6](OSINT-METHODS-AND-SOURCES.md#16-faa-releasable-aircraft-database-n-number-registry).

7. **Airmen validation for priority prospects** *(optional, not yet validated in a campaign)* — For Tier A prospects or those with named personnel from initial registry data, validate mechanic/inspector contacts against FAA Airmen Certification Database to confirm active A&P or IA status. See [OSINT Methods Section 1.7](OSINT-METHODS-AND-SOURCES.md#17-faa-airmen-certification-database).

### Exit Deliverable

`round-[N]/team-a-registry/OUTPUT.csv` — raw candidate list with source refs.

Required accompanying files: `SOURCE-LOG.md`, `RAW-FINDINGS.jsonl`, `TRANSFORM-NOTES.md`, `ISSUES.md`.

**Reference:** `crm-colorado-part145/round-1/team-a-registry/`

---

## Phase 2 — Enrichment

**Goal:** Augment each record with shop profile, website presence, contact channels, and capability signals from open sources.

**Entry gate:** A validated raw candidate list from Phase 1.

### 2.1 Shop Profile Enrichment (Team B Pattern)

For each candidate:
1. Search company name + city on the open web.
2. Visit official website if found. Extract:
   - DBA/trade name confirmation
   - Shop size signals (sq ft, hangar count, team size)
   - Aircraft types worked on
   - Certifications (EASA, OEM authorizations)
   - Profile archetype (avionics-centric, airframe-heavy, engine/component specialist, mixed general MRO, charter-support oriented)
3. Check aviation directories: AEA member directory, OEM service center listings, trade press.
4. Record source URL for every enriched field.

See [OSINT Methods Section 3](OSINT-METHODS-AND-SOURCES.md#3-company-enrichment-methods) for full method details.

### 2.2 Geo / Airport Linkage (Team C Pattern)

1. Map candidate city to nearest airport using NFDC lookup (`faaAirportIndex.ts`).
2. Classify distance band: `on-airport` / `near-airport` / `metro-remote` / `unknown`.
3. Append airport repair capability signals from NFDC: `airframeRepair` (NONE/MINOR/MAJOR), `powerPlantRepair` (NONE/MINOR/MAJOR).
4. Record `basedAircraftTotal` as a local fleet demand signal.

See [OSINT Methods Section 6](OSINT-METHODS-AND-SOURCES.md#6-geo-proximity-analysis) for distance band definitions and linkage method.

### 2.3 Web Observability Scoring (Team D Pattern)

Score each candidate using:

```
observability_score = website_presence + news_signal_12m + directory_presence + contact_discoverability
```

| Component | none/low | basic/medium | strong/high |
|---|---|---|---|
| website_presence | 0 | 20 | 35 |
| news_signal_12m | unknown=4, low=8 | 16 | 25 |
| directory_presence | 0 | low=8, medium=14 | 20 |
| contact_discoverability | 5 | 12 | 20 |

**Score range:** 0–100. **Tiers:** low (< 35), medium (35–65), high (> 65).

Apply unknown policy for missing news signal: score 4, not 0.

See [OSINT Methods Section 2](OSINT-METHODS-AND-SOURCES.md#2-web-observability-methods) for full formula and component definitions.

### 2.4 Coverage Quality Check

**Required fields post-enrichment:** `shop_size_class`, `aircraft_worked_on`, `airport_distance_band`, `observability_score`.

- Any missing required field triggers backfill with conservative heuristic AND explicit provenance flag.
- Default observability score for uncovered rows: 0.20 with `heuristic-fallback` provenance tag.
- Document all backfills in `TRANSFORM-NOTES.md`.

### 2.5 Automated Contact Discovery *(Not Yet Validated)*

> Steps 2.5–2.7 use tools documented in the OSINT Methods catalog but not yet exercised in a campaign run. Apply when manual enrichment throughput is a bottleneck.

1. Run **Apollo.io** or **Hunter.io** against discovered company domains (from Step 2.1) to supplement manual contact extraction.
2. Validate discovered email addresses with **Snov.io** before adding to prospect records (reduces bounce risk).
3. Map discovered contacts against the Target Role Taxonomy ([OSINT Methods Section 4.2](OSINT-METHODS-AND-SOURCES.md#42-target-role-taxonomy)) — prioritize `decision_maker` and `technical_buyer` roles.
4. Record tool name + query parameters as `sourceUrl` for every contact added.
5. Use **LinkedIn Sales Navigator** for role identification at priority prospects (DOM, QC Manager, Owner).

See [OSINT Methods Section 4.5](OSINT-METHODS-AND-SOURCES.md#45-automated-contact-enrichment-tools) for tool details and policy notes.

### 2.6 Entity Validation *(Not Yet Validated)*

1. Check **OpenCorporates** (`opencorporates.com`) for legal entity status — confirm the business is active, not dissolved or suspended.
2. Run **Wayback Machine** (`web.archive.org`) lookup on company domain to assess website history:
   - When did the company first appear online?
   - Have they added or removed service capabilities recently?
   - Any signs of ownership change or rebranding?
3. Optionally run **SpiderFoot** against the company domain for automated reconnaissance (DNS, WHOIS, social profiles, email patterns).

See [OSINT Methods Section 3.9](OSINT-METHODS-AND-SOURCES.md#39-company-intelligence-and-entity-resolution-tools) for tool details.

### 2.7 Activity Signal Enrichment *(Not Yet Validated)*

1. Query **FAA SDR database** (`sdrs.faa.gov`) for the prospect's cert number or legal name to quantify filing volume — a proxy for operational activity and compliance engagement. See [OSINT Methods Section 1.8](OSINT-METHODS-AND-SOURCES.md#18-faa-service-difficulty-reports-sdr).
2. Check **FlightAware AeroAPI** or **ADS-B Exchange** data for traffic volume at the prospect's nearest airport — quantifies local maintenance demand. See [OSINT Methods Section 8](OSINT-METHODS-AND-SOURCES.md#8-aircraft-tracking-and-fleet-intelligence).
3. Cross-reference aviation industry directories (**The145.com**, **ch-aviation**, **Aviapages**) to validate capability claims and discover customer relationships. See [OSINT Methods Section 3.8](OSINT-METHODS-AND-SOURCES.md#38-aviation-industry-directories-and-databases).

### Exit Deliverable

`round-[N]/team-[B/C/D]/OUTPUT.csv` per team — enriched records with source references per field.

---

## Phase 3 — QA and Packaging

**Goal:** Merge, validate, and package all enriched records into a single import-ready artifact.

**Entry gate:** All enrichment outputs from Phase 2.

### Steps

1. **Field completeness audit** — Run against all required fields. Any zero-coverage field fails the audit; apply remediation before proceeding.

2. **Schema alignment** — Verify:
   - `airport_distance_band` is an explicit field (not only embedded in a proximity profile text blob)
   - `observability_score` is a numeric value (not only a tier label)
   - If Steps 2.5–2.7 were run: `entity_status` (from OpenCorporates), `sdr_filing_count` (from SDR query), and `airport_traffic_signal` (from FlightAware/ADS-B) are present where applicable

3. **Record consolidation** — Merge Team B, C, D outputs by candidate identity (`cert_number + legal_name`). Apply deterministic precedence:
   ```
   team-g (direct verification) > team-h (cert validation) > team-e (QA inference)
   ```

4. **Cert validation** — Parse cert tokens with regex `\b[A-Z0-9]{8}\b`. Cross-check against AVInfo registry. Classify each record: `confirmed` / `probable` / `weak`. See [OSINT Methods Section 5](OSINT-METHODS-AND-SOURCES.md#5-certificate-validation).

5. **Outreach tier assignment:**
   - **Tier A** (Ready Now): `confidence >= 0.85` AND has phone/email AND no manual-review flag
   - **Tier B** (Reach with Caution): `confidence >= 0.75` with phone/email AND review caveats present
   - **Tier C** (Research First): no direct contact channel AND/OR unresolved major fields

6. **Produce consolidated package:**
   - `OUTPUT.csv` — all records, fully populated, with provenance
   - `VALIDATION-REPORT.md` — coverage metrics by field
   - `FINAL-OUTREACH-TIERS.md` — tier counts and sample records
   - `PRESENTATION-SUMMARY.md` — business-facing segment summary

7. **Gaps and fixes log** — Document any gaps discovered and remediation steps taken.

### Exit Deliverable

QA-validated consolidated package with:
- 100% required field coverage
- Validation report
- Outreach tier assignments
- Review queue for manual attention

**Reference:** `crm-colorado-part145/round-2/team-e-qa-packaging/` and `round-3/team-i-crm-ready-final/`

---

## Phase 4 — Qualification Assessment (In-App)

**Goal:** A sales or business development operator reviews each prospect and makes a qualification decision.

**Entry gate:** QA package from Phase 3, imported into the Athelon app as static data or Convex records.

**This phase bridges OSINT research and the sales pipeline. It happens inside the app at `/crm/prospects/intelligence` and `/crm/prospects/part135`.**

### 4.1 Campaign Assessment Model

Each prospect x campaign pair gets a `crmProspectCampaignAssessments` record (Convex backend: `convex/crmProspects.ts`):

| Field | Values | Purpose |
|---|---|---|
| `campaignFit` | high, medium, low, unknown | How well prospect fits this campaign |
| `qualificationStatus` | unreviewed, qualified, nurture, research, disqualified | Qualification decision |
| `fitScore` | 1–5 | Numeric fit rating |
| `contactStrategy` | call_first, email_first, multi_touch, warm_intro, research_first, site_visit, other | Planned outreach approach |
| `selectedOutreachTier` | A, B, C | Confirmed or overridden tier |
| `notes` | Free text | Sales assessment notes |
| `nextStep` | Free text | Next action to take |

**Scoping:** Assessments are scoped by `(organizationId, prospectEntityId, campaignKey)`. The same prospect can be assessed under multiple named campaigns independently.

### 4.2 Qualification Criteria (Hormozi-Aligned)

Apply BANT-influenced qualification from the Hormozi sales corpus:

| Factor | Signal Source | High Signal | Low Signal |
|---|---|---|---|
| **Budget** | Shop size class | Medium/large shop = purchasing power present | Small sole-operator shop |
| **Authority** | Contact completeness | Full/good = decision-maker reachable | None = no contact channel |
| **Need** | Profile archetype + observability | Paper-based workflows, compliance burden, narrow capability scope | Digitally mature, broad capabilities |
| **Timing** | Observability signals | Recent news, hiring, new cert announcements = active growth | No web presence, stale information |

### 4.3 Outreach Tier Confirmation

Confirm or override the research-assigned outreach tier (A/B/C) based on operator judgment:

| Override Reason | Direction |
|---|---|
| Known existing relationship | Move to Tier A |
| Known competitor lockout | Move to Tier C |
| Recent facility expansion news | Move up one tier |
| Business closure signals | Disqualify |

### 4.4 Contact Strategy Selection

Based on contact completeness and prospect type:

| Contact Availability | Recommended Strategy |
|---|---|
| Full (phone + email + named contact) | `call_first` or `multi_touch` |
| Good (phone + email) | `email_first` or `call_first` |
| Partial (phone or email only) | `research_first` or `site_visit` |
| None | `research_first` |

### 4.5 Research Issues Triage

Prospects in the review queue (`manual_review_reason = missing_major_fields` or `contact_completeness = none`):

1. Set `qualificationStatus = research`.
2. Set `contactStrategy = research_first`.
3. Document specific missing data in `nextStep` field.
4. These prospects need an enrichment sprint (Phase 2 re-run or SANA agent pipeline) before they can advance.

### Exit Deliverable

Each prospect has:
- A qualification status (qualified / nurture / research / disqualified)
- A contact strategy (if qualified)
- A confirmed outreach tier

Tier A qualified prospects are ready for Phase 5. Tier B requires analyst QA before outreach. Tier C requires a research sprint.

---

## Phase 5 — Outreach Preparation

**Goal:** Prepare targeted outreach materials grounded in OSINT intelligence; apply Hormozi sales framework.

**Entry gate:** Qualified Tier A and B prospects from Phase 4.

### 5.1 Pre-Call Research Brief

Review the OSINT profile for each prospect before contact:

- **Shop profile:** size class, aircraft types worked, profile archetype
- **Airport context:** nearest airport, distance band, airport repair capability
- **Observability signals:** score, web presence tier, recent news
- **Contact data:** phone, email, named contacts with titles
- **CRM notes:** any prior interactions or assessment notes
- **Likely objection type** based on prospect profile (see Section 8.4)

### 5.2 Offer Framing (Hormozi Value Equation)

From `sales-corpus-hormozi/round-1/team-a-offer-value/OUTPUT.md`:

```
Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)
```

Map Athelon's value to the prospect's specific dream outcome — not a generic MRO SaaS pitch:

| Prospect Type | Dream Outcome Example |
|---|---|
| DOM at a small shop | "Pass my next PMI inspection without scrambling" |
| Billing manager at a medium shop | "Stop losing revenue to unbilled labor" |
| Owner of a growing charter-support shop | "Onboard 3 new customer fleets without adding admin staff" |
| QA manager at a large MRO | "Close audit findings in days, not weeks" |

**Niche specificity multiplies price power** (Hormozi P5): reference their specific aircraft types, cert class, and airport proximity in the value pitch.

### 5.3 Outreach Channel Selection

Based on contact strategy from Phase 4, apply the appropriate framework:

**Call-first (CLOSER framework from Team B):**
- Use ANOT opener: "Appreciate you taking my call. Naturally I want to be respectful of your time. Obviously if it doesn't make sense we can part ways. Typically these calls take about 15 minutes."
- Optional Proof-Promise-Plan warm-up: reference a specific OSINT finding about their operation.

**Email-first:**
- Subject line should reference their specific situation, not a generic product name.
- Example: "[Shop name] — compliance tracking for [aircraft type] fleet"

**Multi-touch cadence (from Team B Template 7):**

| Day | Channel | Content |
|---|---|---|
| 0 | Text/WhatsApp | Brief intro, reference to their airport/cert/specialty |
| 2 | Email | Case study from similar profile archetype |
| 5 | Text | Check-in |
| 10 | Email | Value-add content (compliance checklist, regulatory update) |
| 21 | Call/voicemail | Direct outreach |
| 30+ | Monthly email | Long-term nurture |

**No-show policy:** 3 attempts maximum.

### 5.4 BANT Pre-Qualification for Call

From `sales-corpus-hormozi/round-1/team-b-playbooks-scripts/OUTPUT.md` (Template 2):

Score each factor 1–3 during or before the call:

| Factor | 1 (Low) | 2 (Medium) | 3 (High) |
|---|---|---|---|
| Budget | No purchasing authority | Budget exists but needs approval | Budget allocated or owner-operator |
| Authority | Gatekeeper only | Influencer, can champion internally | Decision-maker on the call |
| Need | No clear pain | Acknowledges challenges | Active pain, seeking solutions |
| Timing | "Maybe next year" | "Within 6 months" | "We need this now" |

**Routing:**
- Score 10–12: Priority close
- Score 7–9: Nurture
- Score < 7: Disqualify or long-term nurture

### 5.5 Promote to CRM Account

When a prospect is ready to become an active account:

1. Use **"Promote to Customer"** action in the Prospect Intelligence UI.
2. This calls `promoteProspectToCustomer` mutation in `convex/crmProspects.ts`.
3. Creates a `customers` record with a structured notes field carrying: cert number, airport, tier, archetype, campaign, source refs.
4. Updates the assessment record: `qualificationStatus = "qualified"`, sets `promotedCustomerId` and `promotedAt`.
5. Duplicate check: the mutation checks for existing customers with matching normalized `name` + `companyName` or `email` before creating a new record.
6. From this point forward, the prospect is managed as a CRM account, not as a research record.

---

## 6. Metrics and Progress Tracking

### 6.1 Research Program Metrics (Phases 1–3)

| Metric | Description |
|---|---|
| Candidate count | Total discovered in registry pull |
| Enrichment coverage rate | % of records with all required fields populated |
| Confidence distribution | % very_high / high / medium / low |
| Contact completeness distribution | % full / good / partial / none |
| Outreach tier distribution | Count of A / B / C |
| Manual review queue size | Records requiring additional research |

**Colorado program example:** 71 candidates; confidence: 11 very_high, 5 high, 54 medium, 1 low; contact: 8 full, 18 good, 18 partial, 27 none; tiers: 12 A, 31 B, 28 C; review queue: 27.

### 6.2 Qualification Campaign Metrics (Phase 4)

| Metric | Calculation |
|---|---|
| Reviewed rate | Prospects with status != "unreviewed" / total |
| Qualified rate | Qualified / total reviewed |
| Disqualified rate | Disqualified / total reviewed |
| In-research rate | Research / total reviewed (indicates enrichment gaps) |
| Promoted rate | Promoted to customer / qualified |

**In-app display:** The Prospect Intelligence page shows a campaign progress header with assessed count / total prospects, a progress bar, and breakdown by qualification status.

### 6.3 Sales Funnel Metrics (Phase 5, Post-Promotion)

From `sales-corpus-hormozi/round-1/team-d-systems-metrics/OUTPUT.md`:

| Stage | KPI | Benchmark | Warning | Critical |
|---|---|---|---|---|
| Lead -> Appointment | Set Rate | — | — | — |
| Appointment -> Showed | Show Rate | >= 70% | < 60% | < 50% |
| Showed -> Offer Made | Offer Rate | >= 95% | < 85% | < 70% |
| Offer -> Closed | Close Rate | >= 40% | < 30% | < 25% |

**Additional metrics:** Revenue per call, Days in stage (proxy for stalling), Follow-up attempt count per lead.

**Activity benchmarks:** 50–100 contacts/day (setter), >= 5 follow-up attempts/lead, 6–10 calls/day (closer), < 5 min time-to-first-response (inbound).

### 6.4 Data Quality Indicators

| Indicator | Description |
|---|---|
| Stale records | Research older than 180 days without re-enrichment |
| Issue queue size | Records with `researchIssueFlag = true` |
| Import batch freshness | Date of most recent import run |
| Score version | Observability formula version (prevents confusion when weights change between rounds) |

---

## 7. Repeatable Campaign Playbook

### 7.1 Market Selection Criteria

Applying Hormozi P13 (demand channeling) — select a market where:

| Criterion | Signal |
|---|---|
| Massive pain exists | FAA compliance burden for paper-based Part 145 shops |
| Purchasing power present | Avoid sole-operator shops (1–2 certs); target medium/large |
| Easy to target | FAA AVInfo provides complete universe of cert holders by state |
| Growing | States with active aviation sectors and recent cert activity |

**Leading indicators of a good target state:**
- High concentration of NPIAS airports with significant `basedAircraftTotal`
- Active FBO ecosystem (NFDC: airports with MAJOR airframe and powerplant repair)
- Presence of Part 135 operators cross-linked to Part 145 cert holders (dual-cert operators)

### 7.2 Campaign Team Structure (Round Model)

The Colorado three-round, nine-team structure is the reference implementation:

| Round | Teams | Focus |
|---|---|---|
| Round 1 | A (Registry), B (Enrichment), C (Geo) | Discovery + initial enrichment |
| Round 2 | D (Observability), E (QA/Packaging), F (CRM Surface) | Scoring + packaging + app spec |
| Round 3 | G (Top-N Verification), H (Cert Validation), I (Final CRM-Ready) | Targeted verification + final package |

**For small markets (< 30 prospects):** Compress rounds — run Round 1+2 in one pass, Round 3 focused on only Tier A candidates.

**For rapid turnarounds:** Skip Team F (CRM Surface) if the app surfaces already exist. Focus on Teams A through E, then I.

### 7.3 Cadence and Refresh

| Frequency | Scope |
|---|---|
| Initial campaign | Full 3 rounds as above |
| Quarterly refresh | Re-run Team A (registry pull) and Team D (observability re-score) against existing package |
| Annual full refresh | Re-run all nine teams if the market warrants sustained investment |

### 7.4 New Market Checklist

- [ ] Target market defined (state, cert type, prospect count estimate)
- [ ] FAA AVInfo CSV downloaded for target state, country filter applied
- [ ] NFDC airport data current (run `pnpm data:parse-airports` if data > 90 days old)
- [ ] Part 135 data current (check `part135ResearchPack.dataAsOf` in `part135Operators.ts`)
- [ ] Minimum viable candidate count > 20 for full three-round program
- [ ] Folder structure created: `knowledge/research/[campaign-name]/round-{N}/team-{X}/`
- [ ] Traceability templates populated (SOURCE-LOG.md, TRANSFORM-NOTES.md, etc.)
- [ ] Outreach tier thresholds reviewed and calibrated for market density
- [ ] Campaign name registered in the app for assessment scoping

---

## 8. Integration with Hormozi Sales Framework

### 8.1 OSINT as Market Qualification (Phase 0)

From `sales-corpus-hormozi/round-1/team-a-offer-value/OUTPUT.md` (P13):

The FAA AVInfo pull validates that the market exists and is targetable against all four Hormozi ideal market criteria:

| Criterion | OSINT Validation |
|---|---|
| Massive pain | Part 145 shops face FAA compliance burden; paper-based workflows are common among low-observability shops |
| Purchasing power | Shop size class (medium/large) + fleet scope from OSINT confirms enterprise software purchasing capacity |
| Easy to target | FAA registry provides the complete universe — no need for demand creation |
| Growing | Observability signals (recent news, new cert announcements, hiring) identify actively growing shops |

### 8.2 OSINT as Offer Construction Input

From the Hormozi Grand Slam Offer 5-step construction (P6):

| GSO Step | OSINT Input |
|---|---|
| 1. Define dream outcome | Profile archetype tells you what matters (avionics shop vs. full MRO vs. charter support) |
| 2. List all barriers | Shop size + aircraft types reveal specific compliance challenges |
| 3. Translate barriers to solutions | Aircraft type tags map to specific Athelon features (rotor tracking for helicopter shops, AD compliance for mixed fleets) |
| 4. Define delivery method | Shop size determines onboarding complexity (small = self-serve, large = white-glove) |
| 5. Trim and stack | Contact strategy determines which bonuses to lead with |

### 8.3 OSINT as Pre-Call Intelligence (CLOSER Framework Prep)

From `sales-corpus-hormozi/round-1/team-b-playbooks-scripts/OUTPUT.md`:

**CLOSER step mapping to OSINT data:**

| CLOSER Step | OSINT Data Used |
|---|---|
| **C** (Clarify) | "I saw you're based at [airport] and specialize in [aircraft types] — is that still the core of your work?" |
| **L** (Label) | Restate their situation using profile archetype and shop size signals |
| **O** (Overview / Circle of Pain) | Low observability score suggests paper-based or under-digitized operation — anchor "past failures" to manual processes |
| **S** (Sell the vacation) | Map dream outcome to their specific profile (see Section 5.2) |
| **E** (Explain away concerns) | Use OSINT to preempt objections — e.g., reference similar shops that switched successfully |
| **R** (Reinforce the decision) | Reference their airport's based-aircraft count or recent growth signals |

### 8.4 OSINT-Informed Objection Preparation

From `sales-corpus-hormozi/round-1/team-c-objections-closers/OUTPUT.md`:

| Objection Type | OSINT Signal | Preparation |
|---|---|---|
| **Price** (small shop) | Shop size = small, fleet scope narrow | Prepare cost-of-compliance-failure calculation specific to their cert class |
| **Trust** (regulatory history) | Low confidence label, manual review flag | OSINT may surface prior audit findings — prepare proof of similar shop success |
| **Timing** (growing shop) | High observability score, recent news signals | Reference their own growth signals: "You're expanding — this is exactly when shops outgrow spreadsheets" |
| **Authority** (not the decision-maker) | Contact type = gatekeeper | Coach the champion: "What's the one thing [owner/DOM] will push back on?" |
| **Fit** (specialized niche) | Profile archetype = avionics-centric or engine specialist | Return to Label step, map their specific niche to Athelon capabilities |

### 8.5 Sales Systems Integration

From `sales-corpus-hormozi/round-1/team-d-systems-metrics/OUTPUT.md`:

**CRM fields that bridge OSINT and sales tracking:**

| OSINT Phase | Sales System Field |
|---|---|
| Phase 1 Discovery | `lead_source = "FAA-AVINFO"` |
| Phase 4 Qualification | `appt_timestamps`, `BANT booleans`, `setter_notes` |
| Phase 5 Outreach | `closer_stage_reached` (C/L/O/S/E/R), `objection_type`, `follow_up_attempt_count` |
| Post-Close | `deal_value`, `days_in_stage`, `call_recording_url` |

**Manager cadence for OSINT-sourced pipeline:**
- Daily: async scorecard review of prospects contacted
- Weekly (Monday): funnel diagnostic — what % of Tier A prospects have been contacted?
- Weekly (Wednesday): 1:1 coaching with flagged reps (using call recordings)
- Weekly (Friday): leaderboard update
- Monthly: retrospective — review qualification accuracy (did Tier A prospects actually close at higher rates?)

---

## Appendix: Document Maintenance

- **When to update:** After completing a new campaign through all 5 phases, update metrics examples and add any new workflow steps discovered.
- **Cross-references:** Keep companion document links and section numbers current.
- **Campaign logs belong in their own directories** (`knowledge/research/[campaign-name]/`), not in this document. This document describes the process; campaign artifacts document the execution.
