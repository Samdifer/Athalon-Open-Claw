# OSINT Methods and Sources — Master Reference

> Canonical catalog of all open-source intelligence methods, data sources, enrichment techniques, and validation approaches for MRO prospect intelligence at Athelon.

**Document type:** Method catalog (not a campaign log).
**Companion documents:**
- [SALES-CUSTOMER-RESEARCH-FLOW.md](SALES-CUSTOMER-RESEARCH-FLOW.md) — the end-to-end process that applies these methods.
- [AVIATION-NEWS-AND-MEDIA-SOURCES.md](AVIATION-NEWS-AND-MEDIA-SOURCES.md) — directory of 60+ aviation news outlets, media platforms, and intelligence sources.

**Reference implementation:** [crm-colorado-part145/](crm-colorado-part145/) — 3-round, 9-team OSINT program (71 Colorado Part 145 prospects).

---

## Table of Contents

1. [FAA Registry Sources](#1-faa-registry-sources)
2. [Web Observability Methods](#2-web-observability-methods)
3. [Company Enrichment Methods](#3-company-enrichment-methods)
4. [Contact Discovery Techniques](#4-contact-discovery-techniques)
5. [Certificate Validation](#5-certificate-validation)
6. [Geo-Proximity Analysis](#6-geo-proximity-analysis)
7. [Cross-Dataset Linking](#7-cross-dataset-linking)
8. [Aircraft Tracking and Fleet Intelligence](#8-aircraft-tracking-and-fleet-intelligence)
9. [Confidence Scoring Framework](#9-confidence-scoring-framework)
10. [Data Provenance Tracking](#10-data-provenance-tracking)
11. [Tool Chain](#11-tool-chain)
12. [Quality Assurance Methods](#12-quality-assurance-methods)

---

## 1. FAA Registry Sources

The primary discovery layer. Each source has different retrieval mechanics, update cadence, and reliability profiles.

### 1.1 FAA AVInfo "Find a Facility" (Part 145 Primary Registry)

| Field | Value |
|---|---|
| Source URL | `https://explore.dot.gov/t/FAA/views/AV-Info_FindAFacility/Download.csv?:showVizHome=no` |
| Authoritative landing | `https://www.faa.gov/av-info/facility-dashboard` |
| Access method | Tableau CSV export (direct download, no auth required) |
| Confidence | High (official FAA-hosted data) |

**Available fields:** Agency Name, DBA, Address Lines 1–3, City, State/Province, Postal Code, Country, Agency Phone Number, Agency Email, Cert No, DSGN_CODE.

**Filtering rules:**
- Always apply `State/Province = [STATE]` AND `Country = UNITED STATES` to avoid international false positives (e.g., Coahuila, Mexico uses "CO").
- Filter on `Country` before applying state filter.

**Normalization rules (from Team A):**
- `Agency Name` -> `legal_name`
- `DBA` -> `dba_name` (blank if missing)
- Concatenate non-empty `Address Line 1/2/3` with spaces -> `street`
- `City` -> `city`, force `state` from filter parameter, `Postal Code` -> `zip`
- Build `certificate_hints` as: `Cert <Cert_No>; Designator <DSGN_CODE>` where present
- `Agency Phone Number` -> `phone`; `Agency Email` -> `email`
- `website` left blank (not available in this source)

**Deduplication rules:**
- Dedup exact duplicates on `(legal_name, street, zip, certificate_hints)`.
- Do NOT merge same legal names with different certificate numbers — treat as distinct facilities.
- Records with same legal name and punctuation variants but distinct cert hints are retained as separate rows.

**Limitations:** No website field; contact data is sparse; DBA not always populated.

**Source ref token format:** `FAA-AVINFO-DOWNLOAD-[DATE]`

**Reference artifact:** `crm-colorado-part145/round-1/team-a-registry/`

### 1.2 Repair Station Contacts with Ratings XLSX

| Field | Value |
|---|---|
| Source file | `knowledge/research/industry-context-field-artifacts/Repair Station Contacts with Ratings (Download).xlsx` |
| Use cases | Supplement/cross-validate AVInfo; cert token extraction for validation |
| Confidence | High for identity/cert linkage when cross-matched against AVInfo |

**Cert extraction method:** Parse cert tokens from `certificate_hints` field using regex `\b[A-Z0-9]{8}\b`.

**Reference artifact:** Used by Team C (geo linkage) and Team H (cert validation cross-check).

### 1.3 FAA NFDC Airport Facility Data

| Field | Value |
|---|---|
| Source file | `knowledge/research/airport data/all-airport-data.xlsx` |
| Data currency | FAA NFDC cycle effective 2026-02-19 |
| Record count | 19,606 facilities |
| ICAO coverage | ~2,705 of 19,606 facilities have ICAO codes; remainder use FAA Loc Id only |
| Parse script | `apps/athelon-app/scripts/parse-airport-data.mjs` |
| Refresh command | `pnpm data:parse-airports` (from `apps/athelon-app/`) |

**Output files:**
- `apps/athelon-app/src/shared/data/faaAirports.ts` — full record array (auto-generated, do not edit)
- `apps/athelon-app/src/shared/data/faaAirportIndex.ts` — lazy-loaded O(1) lookups by ICAO or FAA Loc Id, plus `searchAirports()` function

**Key fields extracted (type: `FaaAirportRecord` in `faaAirportTypes.ts`):**

| Field | Description | Values |
|---|---|---|
| `faaLocId` | FAA Location Identifier (3-4 char) | e.g., "DEN", "APA" |
| `icaoId` | ICAO Identifier (4 char) or null | e.g., "KDEN", "KAPA" |
| `facilityName` | Official name | — |
| `facilityType` | Classification | AIRPORT, HELIPORT, SEAPLANE BASE, etc. |
| `state`, `city`, `county` | Location | — |
| `latDecimal`, `lonDecimal` | Airport Reference Point | Decimal degrees |
| `ownership` | Ownership type | PU=Public, PR=Private, MA/MR/MN/CG=Military |
| `airframeRepair` | On-airport airframe repair | NONE, MINOR, MAJOR |
| `powerPlantRepair` | On-airport powerplant repair | NONE, MINOR, MAJOR |
| `fuelTypes` | Available fuel types | e.g., "100LL,JET-A" |
| `part139Cert` | CFR Part 139 certification | "I", "II", "IV", or null |
| `npiasHubClass` | NPIAS hub classification | Large, Medium, Small, Nonhub |
| `basedAircraftTotal` | Total based aircraft count | — |
| `annualOpsTotal` | Total annual operations | — |

**Use cases:**
- Geo proximity linkage for prospect records
- Airport service capability indicator (airframeRepair, powerPlantRepair)
- "On-airport vs. near-airport" band classification
- `AirportRepairServiceBadge` component in the app
- Based aircraft count as a local fleet demand proxy

### 1.4 FAA Part 135 Operators and Aircraft

| Field | Value |
|---|---|
| Source file | `knowledge/research/part 135 operators/Part_135_Operators_and_Aircraft_5.xlsx` |
| Data as of | 2025-03-01 (FAA 2026 update not yet released) |
| Record count | 1,823 operators, 11,406 aircraft, 82 district offices |
| Parse script | `knowledge/research/part 135 operators/generate_part135_data.py` |
| Regeneration | `python3 "knowledge/research/part 135 operators/generate_part135_data.py"` |

**Output file:** `apps/athelon-app/src/shared/data/part135Operators.ts`

**Key fields (type: `Part135OperatorRecord`):**

| Field | Description |
|---|---|
| `entityId` | Unique identifier |
| `legalName` | Certificate holder legal name |
| `certificateDesignator` | FAA certificate designator code |
| `faaDistrictOffice` | Supervising FAA FSDO |
| `fleetSize` | Total aircraft count |
| `fleetSizeClass` | small (1–3), medium (4–10), large (11–30), enterprise (30+) |
| `registrationNumbers[]` | N-numbers in fleet |
| `aircraftModels[]` | All aircraft make/models |
| `uniqueModelCount` | Distinct model count |
| `topModel` | Most common model in fleet |
| `hasTurbine` | Whether fleet includes turbine aircraft |
| `cfrBasis[]` | CFR basis codes |
| `outreachTier` | A, B, or C |

**Outreach tier logic (from generation script):**
- **Tier A:** `fleetSize >= 10` AND `hasTurbine = true`
- **Tier B:** `fleetSize >= 4` OR (`fleetSize >= 2` AND `hasTurbine = true`)
- **Tier C:** Everything else

**Turbine detection:** 50+ FAA make/model prefixes (Bell, Cessna Citation/Caravan/Mustang, Bombardier, Embraer, Pilatus, Daher TBM, Beechcraft King Air/Super King Air, Gulfstream, Sikorsky, Airbus Helicopters, etc.).

**Limitations:** No contact data (phone/email/website) — the FAA dataset does not include it.

### 1.5 faa145search.com (Third-Party Cert Lookup)

| Field | Value |
|---|---|
| URL pattern | `https://www.faa145search.com/repair_station/profile/[NAME]-[CERT-ID]` |
| Confidence | Medium — third-party aggregation, not primary FAA source |
| Use case | Independent cert profile lookup for individual verification |
| Bulk download | Not available — use for targeted individual lookups only |

**Reference artifact:** Used by Team G (top-15 verification) in `crm-colorado-part145/round-3/team-g-top15-verification/`.

### 1.6 FAA Releasable Aircraft Database (N-Number Registry)

> **Validation status:** Not yet exercised in a campaign.

| Field | Value |
|---|---|
| Source URL | `https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download` |
| Access method | Bulk CSV download (no auth required) |
| Update cadence | Daily at 11:30 PM Central |
| Record scope | Every registered U.S. civil aircraft (current, deregistered, reserved) |
| Confidence | High (official FAA-hosted data) |

**Key fields:** N-Number, registrant name, registrant address (street, city, state, zip), aircraft make/model/year, engine type, registration status, certificate issue date.

**Use cases for MRO prospect intelligence:**
- Cross-reference registered owner names against Part 145 legal names to identify repair stations that also own/operate aircraft (self-maintenance signal).
- Cross-reference Part 135 fleet N-numbers against registered owners to build ownership chains.
- Identify aircraft types concentrated near a prospect's airport — validates their claimed capability scope.

**Limitations:** Data is "Required" vs. "Permissible" — permissible fields may be blank and should not be treated as errors. No API — bulk download only.

**Third-party wrappers:**
- `AviationDB` (`aviationdb.com`) — wraps FAA data with historical ownership, SDR data, and airman queries in a single queryable interface. Free for basic queries.
- `simonw/scrape-faa-releasable-aircraft` (GitHub) — open-source scraper for the releasable dataset.
- `Apify FAA Aircraft Registry Scraper` — hosted scraper service.

**Source ref token format:** `FAA-AIRCRAFT-REGISTRY-[DATE]`

### 1.7 FAA Airmen Certification Database

> **Validation status:** Not yet exercised in a campaign.

| Field | Value |
|---|---|
| Source URL | `https://amsrvs.registry.faa.gov/airmeninquiry/` |
| Authoritative landing | `https://www.faa.gov/licenses_certificates/airmen_certification/interactive_airmen_inquiry` |
| Access method | Web form (name search); bulk download also available |
| Confidence | High (official FAA registry) |

**Searchable by:** Name, certificate number. Returns certificate type (A&P, IA, ATP, etc.), ratings held, address.

**Use cases:**
- Validate named mechanic/inspector contacts at prospect shops — confirm they hold active A&P (Airframe and Powerplant) or IA (Inspection Authorization) certificates.
- Estimate shop staffing by counting certified mechanics at an address or in a city.
- Cross-check personnel claims from company websites against FAA records.

**Limitations:** Web form only for individual lookups. Bulk download is comma-delimited but less frequently referenced in OSINT workflows.

**Source ref token format:** `FAA-AIRMEN-[DATE]`

### 1.8 FAA Service Difficulty Reports (SDR)

> **Validation status:** Not yet exercised in a campaign.

| Field | Value |
|---|---|
| Source URL | `https://sdrs.faa.gov/` |
| Query page | `https://sdrs.faa.gov/Query.aspx` |
| Record count | ~1,700,000 reports (1975–present) |
| Access method | Web search (no auth required for public queries) |
| Confidence | High (official FAA system) |

**What it contains:** Service difficulty reports filed by repair stations, operators, and manufacturers. Each report includes aircraft type, part/component affected, nature of difficulty, submitter information, and corrective action.

**Use cases for prospect intelligence:**
- Identify which repair stations are actively filing SDRs — a signal of operational volume and compliance maturity (shops that file SDRs are engaged with the safety reporting system).
- Quantify filing volume by submitter name or cert number as a proxy for work throughput.
- Cross-reference aircraft types in SDRs against a prospect's claimed capability scope.

**Third-party access:** AviationDB (`aviationdb.com`) provides an alternative SDR query interface with the same ~1.7M records.

**Source ref token format:** `FAA-SDR-QUERY-[DATE]`

### 1.9 FAA Data Portal and API Portal

> **Validation status:** Not yet exercised in a campaign.

| Field | Value |
|---|---|
| Data Portal | `https://www.faa.gov/data` |
| API Portal | `https://api.faa.gov/s/` |
| Access method | Dataset downloads and some REST API endpoints |

**What it provides:** Centralized access to FAA datasets across multiple domains (airports, aircraft, airmen, operations). The API portal offers some programmatic endpoints, though coverage varies — not all datasets have API access.

**Use case:** Check for programmatic access to registry and airport data before building custom scrapers. Monitor for new API endpoints as FAA modernizes data access.

---

## 2. Web Observability Methods

Systematized in Team D of the Colorado program. Measures a prospect's digital footprint and web discoverability.

### 2.1 Observability Scoring Formula

```
observability_score = website_presence + news_signal_12m + directory_presence + contact_discoverability
```

**Component weights:**

| Component | Level | Points |
|---|---|---|
| `website_presence` | none | 0 |
| | basic (parked/minimal single-pager) | 20 |
| | strong (owned domain, Services/About/Contact pages) | 35 |
| `news_signal_12m` | unknown (cannot confirm or deny) | 4 |
| | low | 8 |
| | medium | 16 |
| | high | 25 |
| `directory_presence` | none | 0 |
| | low (1 directory) | 8 |
| | medium (1–2 directories) | 14 |
| | high (3+ directories with consistent NAP data) | 20 |
| `contact_discoverability` | low (neither phone nor email found) | 5 |
| | medium (phone or email found) | 12 |
| | high (phone + email found) | 20 |

**Score range:** 0–100. **Maximum possible:** 35 + 25 + 20 + 20 = 100.

**Tier thresholds:**
- Low: < 35
- Medium: 35–65
- High: > 65

**Unknown policy:** When a 12-month news signal cannot be confirmed or denied, use "unknown" (4 points) rather than "none" (0). This avoids penalizing absence of evidence for evidence of absence.

**Reference artifact:** `crm-colorado-part145/round-2/team-d-observability/TRANSFORM-NOTES.md`

### 2.2 Website Presence Detection

- **Signal:** Does the company own an official domain? (vs. only a directory/Google Business/Facebook listing)
- **Basic:** Parked domain or minimal single-pager.
- **Strong:** Company owns domain and has Services, About, and Contact pages.
- **Method:** Web search for company name + city, then domain validation.

### 2.3 News Signal (12-Month Window)

Sources checked:
- Company website news/press pages
- Local/regional business press
- Aviation trade press (AviationWeek, General Aviation News)
- AEA (Aircraft Electronics Association) member directory: `https://aea.net/memberdetails.asp?ID=[ID]`
- Aviation Week marketplace: `https://marketplace.aviationweek.com/company/[company-name]/`

**Signal:** Any content published in the last 12 months referencing the company.

### 2.4 Directory Presence

Sources checked:
- Google Business Profile
- Dun & Bradstreet
- BBB (Better Business Bureau)
- Chamber of commerce listings
- Aviation-specific directories (AEA, NBAA member search)

**Classification:** high = 3+ directories with consistent NAP (Name, Address, Phone) data; medium = 1–2 directories; low = none found.

### 2.5 Contact Discoverability

Sources:
- Company website Contact page
- LinkedIn company page
- AEA member profile

**Classification:** high = phone + email retrievable; medium = phone or email; low = neither found from open sources.

---

## 3. Company Enrichment Methods

Applied by Team B (enrichment) and Team G (top-15 verification).

### 3.1 First-Party Website Research

**Priority order:** Company's own domain > first-party press release > trade press article citing company.

**Extract:**
- DBA/trade name confirmation
- Service description (aircraft types, capability tags)
- Facility size signals (sq ft, hangar count)
- Team size signals ("our team of X")
- Certifications mentioned (EASA, OEM authorizations)

**Rule:** Anchor every enriched field to a source URL. Never enrich without a URL.

### 3.2 OEM Service Center Listings

- **Example:** Pilatus Aircraft service center listing for Cutter Aviation Denver (`https://www.pilatus-aircraft.com/en/service-centers/cutter-aviation-denver`)
- **Signal:** Strong capability confirmation for a specific aircraft platform; also confirms physical address.
- **Search pattern:** `[OEM name] authorized service center [city]`

### 3.3 Chamber of Commerce and Business Directory

- **Use case:** Verify business is active, address confirmation, occasional phone number.
- **Example:** Broomfield Chamber member listing for Gogo Business Aviation.

### 3.4 LinkedIn Company Page

- **Use case:** Employee count signal (shop size confirmation), key personnel titles (DOM, QC manager), recent activity.
- **Limitation:** Data behind a soft paywall for full extraction; use for observation only unless authenticated access is available.

### 3.5 Aviation-Specific Directories

| Directory | Scope |
|---|---|
| AEA (Aircraft Electronics Association) | Avionics shops; member listings include contact and service scope |
| NBAA (National Business Aviation Association) | Corporate aviation service providers |
| AOPA Pilot Services | FBO and maintenance shop locator |

### 3.6 Profile Archetype Classification

Based on enrichment signals, classify each prospect into an archetype:

| Archetype | Indicator |
|---|---|
| `avionics-centric` | Primary services are avionics install/repair |
| `airframe-heavy` | Structural and airframe-focused shop |
| `engine/component specialist` | Turbine or piston engine overhaul focus |
| `mixed general MRO` | Broad capability across airframe, powerplant, avionics |
| `charter-support oriented` | Primarily supports charter/Part 135 fleet maintenance |

### 3.7 Shop Size Classification (Proxy-Based)

| Class | Indicators |
|---|---|
| Small | Low headcount/public footprint, narrow capability profile |
| Medium | Broader capability, moderate staffing/facility indicators |
| Large | Multi-location, high-volume, high-visibility indicators |

### 3.8 Aviation Industry Directories and Databases

> **Validation status:** Not yet exercised in a campaign. Listed as available enrichment sources.

Beyond AEA, NBAA, and AOPA (referenced in Sections 2.4 and 3.5), these directories provide additional enrichment signals:

| Directory | URL | Scope | Access |
|---|---|---|---|
| **The145.com** | `https://www.the145.com/` | Aviation's largest repair-focused marketplace. 3M+ repair capabilities from 500+ repair centers worldwide. Component repair costs, industry-average TAT, ATA chapter data, PMA availability, repair certifications. | Paid subscription |
| **ch-aviation MRO** | `https://www.ch-aviation.com/mro-providers` | 750+ MRO provider profiles with customer relationships, facility locations, maintenance types. Integrates Spire ADS-B satellite data for airframe maintenance event tracking by provider, customer, location, and duration. | Paid subscription |
| **Aviapages MRO Directory** | `https://aviapages.com/mros/` | Global MRO company search by name, country, service type, airport, city. Vetted listings. | Free (basic browsing) |
| **MRO Global Directory** | `https://www.mroglobal-online.com/mro-directory/` | MRO company directory with categorized listings, industry news. | Free |
| **Aviation Week Marketplace** | `https://marketplace.aviationweek.com/` | Supplier directory for MRO companies. Company profiles searchable by service category. Already partially referenced in Section 2.3. | Free (basic profile viewing) |
| **ARSA (Aeronautical Repair Station Association)** | `https://arsa.org/` | Trade association for Part 145 repair stations. Member directory, industry economic data, advocacy reports, compliance training resources. | Member directory may be restricted |

**Enrichment value:**
- Cross-referencing a prospect against The145 or ch-aviation confirms capability claims and reveals customer relationships (who they do work for).
- ARSA membership is a legitimacy and professionalism signal — member shops tend to be more engaged with industry standards.
- Aviapages and MRO Global provide competitive context — who else operates in the same geography and service niche.
- ch-aviation's ADS-B integration can reveal actual maintenance event frequency for larger MROs.

### 3.9 Company Intelligence and Entity Resolution Tools

> **Validation status:** Not yet exercised in a campaign.

| Tool | URL | What It Adds | Access |
|---|---|---|---|
| **OpenCorporates** | `https://opencorporates.com/` | Largest open database of company registrations worldwide (140+ jurisdictions). API for programmatic lookups. Validates legal entity status, registration dates, registered agents, dissolution status. | Free (500 req/mo without key) / Paid API |
| **Wayback Machine** | `https://web.archive.org/` | 704B+ archived web pages. View historical versions of prospect websites. Detect capability additions/removals, ownership changes, rebranding events. | Free |
| **SpiderFoot** | `https://spiderfoot.org/` | Automated OSINT scanner with 200+ data source modules. Input a domain → get DNS records, WHOIS, social media profiles, email addresses, related domains. Open source (self-hosted) or hosted SaaS. | Free (open source) / Paid (hosted) |
| **Maltego** | `https://www.maltego.com/` | Graph-based link analysis tool. Maps relationships between entities (companies, people, domains, emails). 30+ data partner integrations via Transform Hub. Visual entity relationship mapping. Supports custom transforms — could build FAA data transforms. Has Wayback Machine transforms built-in. | Free (Community Edition) / Paid |

**Use cases:**
- **OpenCorporates:** Validate that a legal entity is active and current — catches businesses that may have dissolved or changed status since the last FAA registry update. Confirms registered agent information.
- **Wayback Machine:** Compare a prospect's current website against archived versions to detect when they added or removed capabilities, changed ownership, or underwent rebranding. Useful for "what changed" analysis during re-enrichment cycles.
- **SpiderFoot:** Automates the domain-level reconnaissance that Team B currently performs manually (website structure, DNS, WHOIS, email patterns, social profiles). Reduces per-prospect enrichment time significantly.
- **Maltego:** Could visualize the Part 145 ↔ Part 135 ↔ Aircraft Owner ↔ Airport relationship network as an interactive graph. Custom transforms could pull from FAA registry data to map cert holder → airport → fleet relationships.

---

## 4. Contact Discovery Techniques

### 4.1 Direct Page Extraction

- **Target pages:** Contact, About, Team, Staff pages on company-owned domain.
- **Extract:** Phone numbers, email addresses, physical address, named personnel with titles.
- **Confidence:** High when extracted directly from company-owned domain.

### 4.2 Target Role Taxonomy

From the SANA enrichment design (`knowledge/plans/2026-03-08-prospect-intelligence-sana-enrichment-design.md`):

| Role | Contact Type |
|---|---|
| Owner / President | `decision_maker` |
| DOM (Director of Maintenance) | `decision_maker` or `technical_buyer` |
| QA Manager / QCM | `technical_buyer` |
| Avionics Manager | `technical_buyer` |
| Operations Manager | `decision_maker` or `gatekeeper` |
| Sales / customer-facing contact | `gatekeeper` or `general_contact` |

**ProspectContact data shape:**
```
name: string | null
title: string | null
contactType: "decision_maker" | "technical_buyer" | "gatekeeper" | "general_contact"
email: string | null
phone: string | null
linkedinUrl: string | null
sourceUrl: string
confidence: "high" | "medium" | "low"
```

### 4.3 Source-Backed Policy

- No contact field is promoted to a CRM record without a stored `sourceUrl`.
- Person-level contact info stays `null` if only inferred from role patterns.
- Conflicting records go to a review queue rather than overwriting trusted data.

### 4.4 Contact Completeness Classification

| Level | Criteria |
|---|---|
| `full` | Phone + email + named contact |
| `good` | Phone + email |
| `partial` | Phone or email only |
| `none` | No direct contact channel found |

**Colorado program distribution (71 records):** full: 8, good: 18, partial: 18, none: 27.

### 4.5 Automated Contact Enrichment Tools

> **Validation status:** Not yet exercised in a campaign. Listed as available enrichment accelerators.

These tools automate and scale the manual contact discovery described in Sections 4.1–4.4:

| Tool | URL | Capability | Pricing |
|---|---|---|---|
| **Apollo.io** | `https://apollo.io/` | 275M+ contacts, 73M companies. Email finder, phone numbers, firmographics, email sequencing, CRM integration. Advanced filters enable niche targeting (e.g., "Director of Maintenance" at companies in specific metros). | Free tier (1,200 credits/yr) / Paid |
| **Hunter.io** | `https://hunter.io/` | Domain-based email finder. Input a company domain → get associated email addresses with confidence scores and source attribution. Focused exclusively on email discovery. | Free tier (25 searches/mo) / Paid |
| **Snov.io** | `https://snov.io/` | Email finder + verification (98% accuracy claim), LinkedIn automation, cold email outreach tools. Combines discovery with deliverability validation. | Free tier / Paid |
| **LinkedIn Sales Navigator** | `https://www.linkedin.com/sales/` | Advanced people search by company, title, industry, geography. Essential for finding DOM, QC Manager, Owner roles at prospect shops. InMail messaging. | Paid |

**Integration with existing workflow:**
- These tools slot into Phase 2 (Enrichment) of the [Sales Customer Research Flow](SALES-CUSTOMER-RESEARCH-FLOW.md) and the SANA pipeline's Agent 4 (People and Role Mapping).
- Apollo.io's filters can target specific roles from the Target Role Taxonomy (Section 4.2) at companies in specific metros.
- Hunter.io validates email patterns from company domains found during Phase 2.1 (Shop Profile Enrichment).
- Snov.io provides email verification before adding discovered addresses to prospect records — reducing bounce risk.

**Policy notes:**
- All contacts discovered via these tools must still conform to the Source-Backed Policy (Section 4.3) — record the tool + query as the `sourceUrl`.
- LinkedIn Sales Navigator data is behind a paywall and subject to LinkedIn ToS — use for observation and role identification, not bulk data extraction.
- Prefer Apollo/Hunter verified emails over manual LinkedIn profile extraction.

---

## 5. Certificate Validation

### 5.1 Internal Cross-Validation

Applied by Team H using existing research artifacts:

1. Parse cert tokens from `certificate_hints` field using regex: `\b[A-Z0-9]{8}\b`
2. Cross-check `entity_id`, `cert_no`, and extracted cert(s) against AVInfo registry
3. Confirm `part145_indicator == yes` and `state == [STATE]`
4. Back-link `name + address` triplet to round-1 registry output

**Inputs:**
- `round-1/team-a-registry/OUTPUT.csv` (baseline registry)
- `round-2/team-e-qa-packaging/OUTPUT.csv` (enriched records)

### 5.2 faa145search.com Individual Lookup

- Construct lookup URL using cert number from registry.
- Verify: cert status, certificate class (limited vs. unlimited), ratings listed.
- Use for verification only, not discovery.

### 5.3 Validation Status Taxonomy

| Status | Criteria |
|---|---|
| `confirmed` | Hard cert linkage checks pass AND `overall_confidence >= 0.85` |
| `probable` | Hard cert linkage checks pass BUT `overall_confidence < 0.85` |
| `weak` | One or more hard checks fail (`entity_id/cert_no/hints/part145/state`) |
| `conflict` | Multiple conflicting cert records for same apparent entity |

**Hard checks:** Name/address consistency validated by round-1 key join (`legal_name`, `street`, `city`). Certificate consistency validated by triad check (`entity_id`, `cert_no`, `certificate_hints`).

**Colorado program results:** confirmed: 10, probable: 61, weak: 0.

### 5.4 Multi-Source Precedence Rules

When multiple teams produce records for the same entity, apply deterministic precedence:

```
team-g (direct web verification) > team-h (cert validation) > team-e (QA packaging inference)
```

Direct web-verified records override cert-validation-only records, which override packaged inference records.

---

## 6. Geo-Proximity Analysis

### 6.1 Airport Distance Band Classification

| Band | Criteria |
|---|---|
| `on-airport` | Address/name has airport-campus tokens: AIRPORT, AIRWAY, CONTROL TOWER, HANGAR, or known airport code in address |
| `near-airport` | Mapped airport exists but no direct on-field indicator |
| `metro-remote` | In same metro area but no airport mapping match |
| `unknown` | Insufficient address data to classify |

**Geo confidence:**
- `high` — on-airport with known airport code linkage
- `medium` — mapped city-airport without direct on-field indicator
- `low` — unresolved city-airport mapping

### 6.2 Airport Linkage Method

- **Primary:** City -> nearest airport code using standard FAA Loc Id or ICAO code mapping.
- **Secondary:** Address token heuristics (e.g., "KBJC", "airport", "hangar" in street address).
- **Data source:** FAA NFDC (via `faaAirportIndex.ts` — lazy-loaded, O(1) lookups).

**Note:** This pass uses city-level mapping, not rooftop geocoding. Distances are banded, not numeric nautical miles.

### 6.3 Airport Service Capability Signal

Cross-referencing a prospect's nearest airport against NFDC data reveals on-airport MRO capabilities:

| Field | Values | Meaning |
|---|---|---|
| `airframeRepair` | NONE, MINOR, MAJOR | On-airport airframe repair capability |
| `powerPlantRepair` | NONE, MINOR, MAJOR | On-airport powerplant repair capability |

**In-app display:** `AirportRepairServiceBadge` component at `apps/athelon-app/app/(app)/crm/_components/AirportRepairServiceBadge.tsx`.

**Signal interpretation:** A repair station near an airport with MAJOR airframe repair capability is a higher-signal prospect for a full-service MRO operation.

**Airport repair signal values (persisted on assessment record):**
- `on_airport_major` — prospect is on/near an airport with MAJOR repair
- `on_airport_minor` — on/near an airport with MINOR repair
- `off_airport` — not near an airport with repair services
- `airport_not_found` — airport code not in NFDC database
- `not_reviewed` — not yet cross-referenced

### 6.4 Based Aircraft Count as Demand Proxy

`basedAircraftTotal` from NFDC is a proxy for local fleet size. Airports with high based-aircraft counts represent larger local maintenance demand markets. Use as a weighting signal when prioritizing geographic expansion markets.

---

## 7. Cross-Dataset Linking

### 7.1 Entity Key Construction

From the CRM Surface Implementation Spec (Team F):

```
sourceEntityKey = cert_number + legal_name
```

This enables idempotent re-import across program rounds without creating duplicate records.

### 7.2 Part 145 + Part 135 Cross-Linking

A single operator may hold both Part 145 and Part 135 certificates.

**Link signal:** Matching legal name + city/state + address fragments.

**Use case:** Identify charter operators (Part 135) who also operate a repair station (Part 145). These are very high-value prospects — they need MRO software for their own fleet maintenance AND potentially serve external customers.

**Implementation:** The Part 135 intelligence page builds a `part145NameIndex` (a `Map` at module load time) and checks each Part 135 operator against it. Matches display a blue callout with a link to the Part 145 profile.

### 7.3 Part 145 + NFDC Airport Cross-Linking

**Link signal:** Nearest airport code from Part 145 geo analysis -> NFDC record lookup.

**Use case:** Append on-airport repair capability context from NFDC to the prospect record. Displayed via the `AirportRepairServiceBadge` component.

### 7.4 Confidence Score Propagation

When linking across datasets, the combined confidence is the **minimum** of the individual field confidences. A high-confidence cert match linked to a low-confidence geo match yields a medium-confidence combined record.

---

## 8. Aircraft Tracking and Fleet Intelligence

> **Validation status:** Not yet exercised in a campaign. These sources enable demand-side intelligence — understanding the aircraft population and movement patterns near prospect repair stations.

### 8.1 FlightAware AeroAPI

| Field | Value |
|---|---|
| URL | `https://www.flightaware.com/commercial/aeroapi` |
| Access method | RESTful API (JSON responses) |
| Data coverage | Live + historical flight data by tail number or flight ID, back to January 2011 |
| Pricing | Paid (tiered — personal, standard, premium) |
| Confidence | High (FlightAware operates the world's largest flight tracking platform, 10,000+ aircraft operators) |

**Use cases for prospect intelligence:**
- **Airport traffic volume:** Query flight activity at a prospect's nearest airport to quantify how many turbine/GA aircraft visit monthly — a direct local maintenance demand signal.
- **Fleet movement patterns:** Track specific N-numbers from Part 135 operator fleets to understand where they fly and base — identifies which airports/shops they might use for maintenance.
- **Predictive ETAs:** FlightAware Foresight provides predictive arrival data — less directly useful for OSINT but available in the API.

### 8.2 ADS-B Exchange

| Field | Value |
|---|---|
| URL | `https://www.adsbexchange.com/` |
| Access method | Web interface (free); API (paid) |
| Data coverage | Unfiltered ADS-B tracking data — no military or privacy filtering (unlike FlightAware/FlightRadar24) |
| Confidence | Medium (community-driven receiver network; coverage varies by geography) |

**Use cases:**
- Identify specific N-numbers frequenting a prospect's airport — reveals which aircraft owners are likely customers or potential customers of that repair station.
- Unfiltered data means government and military aircraft movements are visible — relevant for shops near military installations that may do contract maintenance.

### 8.3 AviationDB (Third-Party FAA Data Aggregator)

| Field | Value |
|---|---|
| URL | `https://www.aviationdb.com/` |
| Access method | Web queries (free for basic) |
| Data sources aggregated | FAA Aircraft Registry (current + deregistered), SDRs, Airman records |

**Use cases:**
- Single interface for looking up aircraft by N-number (with historical ownership chain), querying SDRs by part/aircraft type, and searching airman records.
- Useful for individual prospect verification without downloading full FAA bulk datasets.
- Historical ownership data reveals aircraft that changed hands — potential maintenance events at nearby repair stations.

### 8.4 Demand Signal Analysis

Combining fleet intelligence with prospect data enables demand-side analysis:

| Signal | Source | Interpretation |
|---|---|---|
| High based-aircraft count at nearest airport | NFDC (Section 1.3) | Large local fleet = sustained maintenance demand |
| High turbine traffic at nearest airport | FlightAware / ADS-B Exchange | Active turbine operations = higher-value maintenance work |
| Part 135 operators based at same airport | Part 135 data (Section 1.4) | Charter fleet operators need regular maintenance — potential captive customer base |
| Aircraft ownership concentration | FAA Releasable Aircraft DB (Section 1.6) | Multiple aircraft registered to entities near the prospect = cluster demand |

---

## 9. Confidence Scoring Framework

### 9.1 Field-Level Confidence

| Level | Criteria |
|---|---|
| `high` | Directly observed from first-party source (FAA registry, company website, OEM listing) |
| `medium` | Inferred with two or more corroborating signals, or from a reliable secondary source |
| `low` | Single indirect signal or heuristic fallback |

### 9.2 Record-Level Confidence (Overall)

| Label | Score Range | Criteria |
|---|---|---|
| `very_high` | 0.90–1.00 | Cert confirmed, identity verified, direct web evidence |
| `high` | 0.85–0.89 | Cert confirmed, one additional signal |
| `medium` | 0.75–0.84 | Cert probable, registry match only |
| `low` | Below 0.75 | Missing major fields or conflicting signals |

**Colorado program distribution (71 records):** very_high: 11, high: 5, medium: 54, low: 1.

### 9.3 Confidence Decay Policy

- Records older than 180 days should be flagged as "stale" for re-verification.
- Store the observability score version with each snapshot (score formula weights can change between rounds).
- **Conservative fallback policy:** When a field cannot be confirmed, do not infer. Apply "unknown" rather than a guess.

### 9.4 Outreach Tier Qualification Thresholds

| Tier | Criteria | Action |
|---|---|---|
| **A** (Ready Now) | `confidence >= 0.85` AND has phone/email AND no manual-review flag | Launch outreach immediately |
| **B** (Reach with Caution) | `confidence >= 0.75` with phone/email AND review caveats present | Pair outreach with analyst QA |
| **C** (Research First) | No direct contact channel AND/OR unresolved major fields | Run enrichment sprint before any outbound |

**Colorado program distribution:** Tier A: 12, Tier B: 31, Tier C: 28.

**Reference artifact:** `crm-colorado-part145/round-3/team-i-crm-ready-final/FINAL-OUTREACH-TIERS.md`

---

## 10. Data Provenance Tracking

### 10.1 Source Ref Tokens

All source references should be assigned a stable internal token — not only an external URL (external URLs can rot; internal tokens are stable).

**Format:** `[SOURCE]-[DATE]`
**Example:** `FAA-AVINFO-DOWNLOAD-2026-03-07`

### 10.2 Required Provenance Fields per Record

From the CRM Surface Implementation Spec (Team F):

| Field | Description |
|---|---|
| `researchRound` | Integer (1, 2, 3...) |
| `researchTeam` | String (e.g., "team-g") |
| `researchConfidence` | high / medium / low |
| `researchProvenanceRefs[]` | Array of source ref tokens |
| `researchLastImportedAt` | Timestamp |
| `researchIssueFlag` | Boolean — unresolved quality issue |
| `researchIssueSummary` | Description of unresolved issue |

### 10.3 Artifact Chain (Required Files per Team Step)

Every team output must maintain:

| File | Purpose |
|---|---|
| `SOURCE-LOG.md` | What sources were accessed, at what timestamp, with what confidence |
| `RAW-FINDINGS.jsonl` | One JSON line per finding, before normalization |
| `TRANSFORM-NOTES.md` | Normalization rules, dedup logic, unresolved ambiguities |
| `OUTPUT.csv` | Normalized output ready for the next team or for import |
| `ISSUES.md` | Unresolved quality flags for downstream teams or QA |

**Folder convention:** `knowledge/research/[campaign-name]/round-{N}/team-{X}/`

### 10.4 Immutable Snapshot Policy

When intelligence is imported into Convex, create an immutable `crmProspectIntelligenceSnapshots` record (schema defined in Team F CRM Surface Spec). Prior snapshots are not overwritten; `isCurrent` is flipped to `false` on the old record and `true` on the new. This enables:
- Field-level diffs between snapshots
- Full audit trail for every field change
- Rollback to prior state if an import introduces errors

**Snapshot record includes:** regulatory profile, shop profile, location profile, observability scores, research metadata, and `sourceLogRefs[]`, `rawFindingRefs[]`, `transformNoteRefs[]`.

---

## 11. Tool Chain

### 11.1 Data Processing Scripts

| Script | Input | Output | Invocation |
|---|---|---|---|
| `apps/athelon-app/scripts/parse-airport-data.mjs` | `knowledge/research/airport data/all-airport-data.xlsx` | `src/shared/data/faaAirports.ts` + `faaAirportIndex.ts` | `pnpm data:parse-airports` |
| `knowledge/research/part 135 operators/generate_part135_data.py` | `Part_135_Operators_and_Aircraft_5.xlsx` | `src/shared/data/part135Operators.ts` | `python3 generate_part135_data.py` |

### 11.2 SANA Enrichment Pipeline (Designed, Not Yet Implemented)

**Reference:** `knowledge/plans/2026-03-08-prospect-intelligence-sana-enrichment-design.md`

Five-agent topology, executed in sequence:

| Agent | Purpose | Key Outputs |
|---|---|---|
| 1. Registry Match Agent | Lock identity against FAA data | Canonical legal name, cert reference, identity confidence |
| 2. Official Web Discovery Agent | Find verified website URL | `websiteUrl`, `websiteStatus`, `contactPageUrl`, `servicesPageUrl` |
| 3. Contact Channel Agent | Extract phone, email, address | Per-field value + sourceUrl + confidence |
| 4. People and Role Mapping Agent | Discover named contacts with buying roles | Per-person: name, title, contactType, email, phone, linkedinUrl |
| 5. Verification and Merge Agent | Cross-validate, reject weak claims | Field-level confidence, merge decision log, review queue |

**Execution order:** Tier A prospects first, then Tier B, then manual-review records.

**Guardrails:**
- No field promoted without at least one source URL.
- Person-level contact info must remain `null` if only inferred.
- Conflicting websites/people go to review queue.
- Must emit field-level confidence and merge decision log.

### 11.3 App Data Surfaces

| Route | Data Source | Backend |
|---|---|---|
| `/crm/prospects/intelligence` | `coloradoPart145Research.ts` (static, 71 records) | `convex/crmProspects.ts` (assessments + promotion) |
| `/crm/prospects/part135` | `part135Operators.ts` (static, 1,823 records) | `convex/crmProspects.ts` (same pattern) |
| Airport badge (shared component) | `faaAirportIndex.ts` (lazy-loaded static) | None (client-side lookup) |

**Architecture note:** All prospect records are bundled as static TypeScript files — not stored in Convex. Only per-org qualification assessments and campaign assignments are persisted in Convex. This avoids replicating large datasets into the database.

### 11.4 OSINT Frameworks and Aggregator References

> **Validation status:** Reference resources — not tools to exercise directly, but indexes to discover additional tools as needs arise.

| Resource | URL | What It Is |
|---|---|---|
| **OSINT Framework** | `https://osintframework.com/` | Categorized directory of free OSINT tools organized by data type (username, email, domain, company, geolocation, etc.). Useful reference when a specific enrichment need arises that isn't covered by existing tools. |
| **awesome-osint (GitHub)** | `https://github.com/jivoi/awesome-osint` | Community-curated list of OSINT tools and resources. Continuously maintained. Covers categories from people search to image analysis to business records. |
| **Recorded Future OSINT Tools List** | `https://www.recordedfuture.com/threat-intelligence-101/tools-and-technologies/osint-tools` | Curated list of 15 free OSINT tools with descriptions and use cases. Oriented toward security/intelligence but many tools overlap with business OSINT. |

**When to use:** Consult these indexes when a campaign requires a specific data type not covered by the tools documented in this catalog. Before adding a new tool to this document, verify it against the anti-patterns in Section 12.4.

---

## 12. Quality Assurance Methods

### 12.1 Team-Based QA Pattern

From the Colorado program: a dedicated QA/Packaging team (Team E) runs after enrichment is complete.

**QA team responsibilities:**
1. Check coverage completeness — zero tolerance for missing required fields after remediation.
2. Validate field-level confidence assignments.
3. Apply conservative backfills with explicit provenance for any field filled by heuristic.
4. Produce a `VALIDATION-REPORT.md` with coverage counts.

**Required fields post-enrichment:** `shop_size_class`, `aircraft_worked_on`, `airport_distance_band`, `observability_score`.

### 12.2 Review Queue

Records that fail quality gates or have unresolved major fields go to a `REVIEW-QUEUE.csv`. Downstream teams and app operators can process this queue.

**Queue inclusion criteria:**
- `manual_review_reason` includes `missing_major_fields`
- `contact_completeness = none`
- `overall_confidence < 0.75`

### 12.3 Deterministic Precedence Rules

When multiple teams have produced records for the same entity:

```
Direct web verification (team-g) > Cert validation (team-h) > QA packaging inference (team-e)
```

Document the precedence rule in the final validation report.

### 12.4 Anti-Patterns to Avoid

| Anti-Pattern | Why |
|---|---|
| Infer website from a Google Maps listing | Requires a first-party owned domain |
| Fill empty email from LinkedIn unless from a public profile | Soft-paywall data is not verifiable OSINT |
| Merge entities on legal name alone | Require cert number or address match |
| Mark a record "confirmed" without a source URL | Every claim needs an auditable link |
| Use "none" (0 points) for unknown news signal | Use "unknown" (4 points) — absence of evidence != evidence of absence |
| Score as 0.0 and backfill later | Conservative default with explicit provenance tag instead |
| Use scraped LinkedIn data without ToS awareness | Prefer Apollo/Hunter verified emails over manual LinkedIn extraction |
| Treat ADS-B/FlightAware data as definitive proof of maintenance events | Flight tracking shows aircraft presence at an airport, not confirmed maintenance — it's a signal, not a fact |
| Add tool-discovered contacts without source attribution | Record the tool name + query parameters as `sourceUrl` for contacts found via Apollo, Hunter, Snov.io, etc. |

---

## Appendix: Document Maintenance

- **When to update:** Append a new method or source section when it is exercised in an actual program run, or when research validates it as a viable tool. Methods not yet exercised in a campaign are tagged with `> **Validation status:** Not yet exercised in a campaign.` and should be promoted (tag removed) after first successful use.
- **Versioning:** Note the date and campaign that introduced each new method.
- **Do not overwrite:** Prior method descriptions remain valid; new versions supplement, not replace.
- **Cross-references:** Keep companion document links current — update if file paths change.
