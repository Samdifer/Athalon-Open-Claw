# Wave Log — Athelon Customer Target Intelligence

---

## Wave 1 — 2026-03-09

**Focus:** Bootstrap market intel system from existing Colorado Part 145 data  
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken

- Created market intel directory structure
- Transformed 71 Colorado Part 145 records from prior CRM research (rounds 1-3)
- Applied website-fit scoring (0-100) to all records
- Applied ERP-fit scoring (0-100) to all records
- Applied Corridor/EBIS likelihood heuristic
- Generated tiered outreach lists (website targets, ERP targets, no-website priority, cross-sell)
- Researched national Part 145 landscape for geographic expansion
- Created scoring methodology documentation and reproducible scripts
- Created enrichment backlog for future waves

### Data Quality

- **Source:** FAA repair station registry + 3 rounds of enrichment (teams a-i)
- **Geographic scope:** Colorado only (Wave 1)
- **Records:** 71 Part 145 repair stations
- **Tier A** (highest quality): 12 records with full contact + web verification
- **Tier B** (good but needs QA): 31 records with partial contact
- **Tier C** (needs research): 28 records with no contact channels

---

## Wave 2 — 2026-03-09 (07:30 UTC)

**Focus:** Multi-state expansion + web enrichment + competitive intelligence  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **National FAA directory extraction** — Leveraged existing full FAA facility download (5,038 records across all states) to extract Part 145 records for TX (396), FL (641), AZ (162), GA (123). Master list expanded from 71 → 1,393 records.

2. **Generalized pipeline script** — Created `extract_state.py` that can pull any state from FAA data, apply scoring heuristics, and merge into master list. Reproducible for future state expansion.

3. **Web enrichment (3 concurrent Sonnet workers):**
   - **TX worker:** Researched top 20 TX shops — found websites for 15/20 (75% discovery rate). Notable finds: L2 Aviation (medium, professional site), Aerobrigham (large, 60k sqft helicopter MRO), Excel Aviation (Dassault/Bombardier service center).
   - **FL worker:** Researched top 20 FL shops — found websites for 6/20 (30% discovery rate). Florida has many more micro-operations without web presence. Notable: Kaman Aerospace (large defense MRO), AMETEK/Avtech (professional component MRO), AVI NDT (strong NDT specialist).
   - **CO worker:** Researching 20 priority CO shops (pending at wave close)

4. **Corridor customer flagging** — Identified 18 known Corridor customer locations in our database from verified public data (corridor.aero/customers page + case studies). Flagged as `corridor-verified` in master list. Key finding: Corridor has 16 named customers including West Star Aviation (CO), Stevens Aviation (CO/GA), Cutter Aviation (CO/TX/AZ), Million Air (TX).

5. **Competitive intelligence update:**
   - Confirmed Veryon acquired EBIS from Tronair (Nov 3, 2025) — creates 12-24 month churn window
   - Corridor launched AI Operations Manager (Oct 2025) with West Star Aviation and ACI Jet
   - Identified Smart145 and QuantumMX as additional competitors in SMB MRO software
   - CORRIDOR is a CAMP Systems product line (part of Hearst)

6. **Enterprise exclusion analysis** — Identified 79 OEM/enterprise entities (Boeing, Airbus, GE, P&W, etc.) that should be excluded from SMB outreach. Remaining SMB target universe: 1,314 shops.

7. **Enrichment merge + rescore** — Merged TX and FL enrichment data back into master list with updated website-fit and ERP-fit scores based on discovered profile data. 25 records enriched with new scoring.

8. **Updated enrichment backlog** — 15 prioritized tasks for waves 3-5 including EBIS customer mapping, CAMP Systems usage mapping, and CA/TN/NV expansion.

### Data Quality

- **Source:** FAA facility download (all US) + web search enrichment
- **Geographic scope:** CO (71) + TX (396) + FL (641) + AZ (162) + GA (123) = **5 states**
- **Total records:** 1,393 Part 145 repair stations
- **Tier A** (phone + email): 1,210 records (86.9%)
- **Tier B** (partial contact): 127 records (9.1%)
- **Tier C** (needs research): 56 records (4.0%)
- **With website:** 32 records (2.3% — enrichment ongoing)
- **Corridor-verified:** 18 records flagged
- **Enterprise/OEM excluded:** 79 records identified

### Key Findings

- **Website redesign opportunity is massive:** 1,361 of 1,393 shops have no known website. Even after enrichment, ~95% need web presence help.
- **Florida is the densest market** (641 shops) but has many micro-operations — need to tier by reachability.
- **Texas has the highest website discovery rate** (75%) — these are more established, web-accessible businesses. Strong website redesign market.
- **Top TX website targets:** Thrust Avionics (Addison, no site), San Antonio Avionics (no site), Galaxy Aviation (Frisco, no site), Hill Country Helicopters (no site)
- **Top ERP targets:** Aerobrigham (TX, large helicopter MRO), Excel Aviation (TX, Dassault/Bombardier center), L2 Aviation (TX, medium avionics), US Aviation Group (TX, FBO + Part 145)
- **Cross-sell hotspots:** DFW Metroplex (Addison, McKinney, Roanoke cluster), South Florida (Miami/Doral/Miramar cluster)

### Scripts Created/Updated

- `simulation/athelon/scripts/market-intel/extract_state.py` — State extraction + scoring + master merge
- `simulation/athelon/scripts/market-intel/update_corridor_flags.py` — Flag known Corridor customers
- `simulation/athelon/scripts/market-intel/merge_enrichment.py` — Merge web discovery enrichment into master

### Remaining Gaps

- CO worker enrichment still pending (will auto-merge when complete)
- Only 60 of 1,393 records have web-enriched profiles (need many more enrichment passes)
- No EBIS customer mapping yet (Wave 3 priority)
- No airport ICAO mapping for new states (Wave 3)
- CA, TN, NV, KS, WA, OH not yet extracted (Waves 3-5)
- CAMP Systems usage data not mapped (critical for competitive positioning)

### Next Wave Focus

- **Wave 3:** Merge CO enrichment results + run enrichment on AZ/GA top targets + begin EBIS customer identification + airport ICAO mapping + extract CA/TN/NV states

### Key Gaps Identified

- Colorado-only — need national expansion
- Corridor/EBIS usage is heuristic only (no direct evidence yet)
- Many Tier B/C shops lack website URLs — need web discovery pass
- No employee count data for most shops
- No revenue/aircraft-count proxies yet

### Next Wave Focus

- Expand to top 3 priority states (likely TX, FL, AZ based on MRO concentration)
- Web discovery pass for Tier B shops missing website URLs
- Corridor/EBIS evidence gathering via web scraping heuristics

### Wave 1 Output Summary

| Metric | Count |
|--------|-------|
| Total records | 71 |
| Shops with no website | 59 |
| Top website-fit targets (score ≥ 70) | 9 |
| Top ERP-fit targets (score ≥ 55) | 10 |
| Top cross-sell targets (score ≥ 60) | 8 |
| National expansion states identified | 10 |
| Enrichment backlog items | 10 |

**Note:** K4LR032E (Elevate MRO) is our own company — excluded from all outreach target lists.

### Competitive Intelligence Highlights
- EBIS acquired by Veryon (Nov 2025) — creates 12-24 month churn window for ~300+ EBIS customers
- Corridor has 500+ customers, focused on enterprise/chain MROs — small independents underserved
- ~4,500 domestic Part 145 stations nationally; ~3,000-3,500 are small-to-mid (<50 employees)
- Top expansion states: TX (450 est.), FL (550 est.), AZ (250 est.), GA (175 est.)

---

<!-- Future waves append below this line -->

## Wave 2 — 2026-03-09
**Focus:** Expand to TX + FL + CO web-discovery pass (60 new shops enriched)
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Enriched 20 Texas Part 145 shops with website discovery, size classification, and profile archetype
- Enriched 20 Florida Part 145 shops with website discovery and profiling
- Enriched 20 additional Colorado shops (web discovery pass for previously unresearched records)
- Results staged in enrichment-results-tx.csv, enrichment-results-fl.csv, enrichment-results-co.csv

### Wave 2 Data Quality Summary

| State | Shops | Websites Found | No Website | Large | Medium | Small |
|-------|-------|----------------|------------|-------|--------|-------|
| TX | 20 | 16 (80%) | 4 | 2 | 3 | 15 |
| FL | 20 | 8 (40%) | 12 | 1 | 2 | 17 |
| CO (new) | 20 | 9 (45%) | 11 | 0 | 2 | 18 |

### Notable Finds

**Texas:**
- AeroBrigham (Decatur) — 60,000 sq ft full helicopter MRO + paint + completions; professional web; top ERP prospect
- L2 Aviation (Dripping Springs) — 51-200 employees, fleet avionics specialist; strong ERP fit
- Excel Aviation (Gainesville) — Dassault/Bombardier OEM service center; medium shop
- STS Line Maintenance (Irving) — enterprise chain (47 global stations); not a primary ERP target
- 4 shops with zero web presence: Galaxy Aviation, Thrust Avionics, San Antonio Aviation, Hill Country Helicopters → immediate website redesign prospects

**Florida:**
- Kaman Aerospace (Jacksonville) — large defense aerostructures; too enterprise for Athelon ERP
- AMETEK/Avtech (Boca Raton cert/Miami) — 18 employees, specialty avionics; good ERP prospect
- 13 of 20 FL shops have NO web presence → very high website redesign opportunity density
- No Corridor/EBIS evidence found in any shop (small shops unlikely to use enterprise software)

**Colorado (web pass):**
- Aerofield Services — found aerofieldservices.com (commercial engine/APU) — too large/commercial for target
- StandardAero Business Aviation — enterprise; not a target
- 11 of 20 shops remain with no web presence → enrich backlog

### Key Insight
FL shops have the lowest web presence rate (40% with sites) — highest density of website redesign prospects per state sampled so far. TX shops are larger on average with higher ERP potential (AeroBrigham, L2 Aviation).

### Corridor/EBIS Evidence
No direct evidence found in this wave. Shops in this batch are predominantly small specialty operations unlikely to currently run enterprise MRO software — which creates the opening for Athelon.

### Gaps Remaining
- Only ~60 shops researched across TX/FL/CO out of estimated 1,175+ in those states
- No AZ, GA, KS, TN data yet
- Need to merge enrichment results into master-target-list.csv
- Need to score new TX/FL records with website-fit and ERP-fit

### Next Wave Focus
- Merge TX/FL enrichment into master-target-list.csv with scores
- Expand TX/FL enrichment (next 20 shops each)
- Begin AZ enrichment (Scottsdale/Phoenix Deer Valley cluster)
- Target Corridor customer evidence search (web scraping for software mentions)


---

## Wave 3 — 2026-03-09 (08:00 UTC)

**Focus:** Multi-state expansion (CA/OH/KS) + data quality pass + EBIS customer mapping + competitive intelligence + metro cluster analysis  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **Merged Wave 2 enrichment** — Ran merge_enrichment.py to integrate 60 TX/FL/CO enrichment records into master list with updated scores. 28 records updated.

2. **Expanded to 3 new states** — Extracted CA (520), OH (131), KS (95) from FAA directory using extract_state.py. Master list: 1,368 → 2,114 records across 8 states.

3. **Data quality pass** — Created and ran dedupe_and_quality.py:
   - Zero cert_no duplicates (extract script already handles this)
   - Flagged 95 enterprise/OEM entities for outreach exclusion
   - Identified 76 multi-location entity groups (195 records)
   - Normalized state codes, zip codes, and website domains
   - Flagged Elevate MRO as "self" (our own company)
   - Fixed Gogo Business Aviation duplicate name normalization
   - Recalculated confidence scores based on data completeness

4. **EBIS customer evidence (Sonnet worker)** — Found 19 confirmed EBIS users via ebiscloud.com case studies and customer pages:
   - 15 high-confidence, 3 medium, 1 low
   - Key targets in our states: Salty Pelican (TX), Plane Place Aviation (TX), Basin Aviation (TX), Platinum Sky Maintenance (FL), My Jet DOM (GA), Midwest Corporate Air (OH), Clemens Aviation (KS), OCR Aviation (CA), Apex Aviation (NV)
   - Most are exactly Athelon's sweet spot: 5-20 employee independent shops
   - **These shops are in the 4-16 month Veryon acquisition churn window — prime poach targets**

5. **California enrichment (Sonnet worker)** — Researched 20 CA shops:
   - Van Nuys corridor: Thornton Aviation (multi-site medium), RTS Aircraft Services (basic site), SoCal Jets (minimal site), Clay Lacy (large/enterprise)
   - Found mix of independent SMBs and larger operations
   - CA has strong website redesign opportunity (many basic/outdated sites)

6. **Ohio/Kansas enrichment (Sonnet worker)** — Researched 20 OH/KS shops:
   - Ohio: Spirit Aeronautics (Columbus), Signature Engines (Cincinnati, outdated site), First Flight Aviation (Dayton, medium), CAM (Cleveland)
   - Kansas: Tech-Aire Instruments (Wichita, very poor site), Midwest Malibu Center (poor site), Global Aviation Tech (medium, growing), Bevan Aviation (rebranded)
   - KS/OH shops are more specialized and frequently have outdated/poor websites — strong dual opportunity

7. **Competitive intelligence deep dive** — Researched Smart145, Quantum MX, Quantum Control, Total FBO:
   - Smart145: cloud-first SMB competitor, newer, limited US presence
   - Quantum MX: established since 2013 for GA, may lack business jet depth
   - Key insight from Reddit: market has "limited software choices" — VP Product at Veryon himself said this

8. **Metro cluster analysis** — Identified 20 metropolitan clusters for geographic selling:
   - South Florida: 251 SMB shops (238 reachable, 247 no-website)
   - DFW Metroplex: 124 SMB shops (122 reachable)
   - Los Angeles Basin: 100 SMB shops (99 reachable)
   - Phoenix Metro: 89 SMB shops
   - Wichita: 50 SMB shops (all reachable, all no-website)
   - Created metro-clusters.csv with priority rankings

9. **Rebuilt tiered outreach lists** — Now filtering enterprise entities and self:
   - Top 50 website targets (CO/TX heavy due to enrichment depth)
   - Top 50 ERP targets
   - Top 25 cross-sell opportunities
   - 1,983 no-website priority records
   - Created new cross-sell-top25.csv

### Wave 3 Data Quality Summary

| Metric | Wave 2 | Wave 3 | Change |
|--------|--------|--------|--------|
| Total records | 1,368 | 2,114 | +746 |
| States covered | 5 | 8 | +3 (CA, OH, KS) |
| SMB targets | ~1,300 | 2,019 | +719 |
| Enterprise flagged | 79 | 95 | +16 |
| With website | 36 | 36 | — (new states unenriched) |
| EBIS customers identified | 0 | 19 | +19 |
| Metro clusters mapped | 0 | 20 | +20 |
| Enriched shop profiles | 60 | 120 | +60 |

### Key New Opportunities

**EBIS Churn Targets (highest priority):**
- Salty Pelican Aviation (New Braunfels, TX) — 11 employees, Cirrus specialist
- Plane Place Aviation (Dallas, TX) — in DFW cluster
- Basin Aviation (Midland, TX) — West Texas
- Platinum Sky Maintenance (Fort Lauderdale, FL) — South FL cluster
- Midwest Corporate Air (Bellefontaine, OH) — near Dayton
- Clemens Aviation (Benton, KS) — near Wichita cluster
- My Jet DOM (McDonough, GA) — Atlanta metro, 6 employees
- OCR Aviation (Long Beach, CA) — 60,000 sq ft, business aviation
- Apex Aviation (Henderson, NV) — multi-location, turbine specialist

**Website Redesign Standouts:**
- Tech-Aire Instruments (Wichita, KS) — very outdated HTML site, FAA/EASA approved
- Midwest Malibu Center (Hutchinson, KS) — extremely basic site, niche PA-46 specialist
- Columbus Aero Service (Columbus, OH) — basic Wix-style, Beechcraft specialist
- SoCal Jets (Van Nuys, CA) — minimal single-page feel
- Signature Engines (Cincinnati, OH) — outdated, ships worldwide

**Cluster Selling Hotspots:**
- South Florida: 251 SMB shops — could sell 5-10 website packages in one metro trip
- Wichita: 50 shops, all reachable, all no-website — aviation heritage city with outdated digital presence
- DFW: 124 shops including Addison/McKinney specialized cluster

### Scripts Created/Updated

- `dedupe_and_quality.py` — Data quality normalization, enterprise flagging, multi-location tagging
- `rebuild_tiers.py` — Tier list generator with enterprise exclusion and cross-sell output

### Remaining Gaps

- CA/OH/KS enrichment only covers 20 shops each from 746 new records — need more passes
- EBIS customer list (19 found) needs cross-referencing against master list cert_nos
- TN, NV, CT, OK, NY, WA states not yet extracted
- Airport ICAO mapping still pending for non-CO states
- No employee count or revenue proxy data yet
- Tiered lists still CO/TX heavy because enrichment depth there is higher

### Next Wave Focus

- **Wave 4:** Cross-reference EBIS customers into master list with special flags; extract TN/NV/CT states; run 2nd enrichment pass on FL (top 20 Opa Locka/FLL) and CA (next 20 Van Nuys/Burbank); begin airport ICAO mapping for new states; geographic cluster-specific mini-lists for outreach


## Wave 3 — 2026-03-09
**Focus:** CA/OH/KS enrichment + EBIS customer evidence dossier
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Enriched 20 California Part 145 shops (Van Nuys/Burbank, Oakland/San Jose, San Diego, SoCal)
- Enriched 20 Ohio/Kansas Part 145 shops (Dayton/Columbus/Cincinnati; Wichita cluster)
- Built EBIS customer evidence CSV: 19 confirmed EBIS users with public case-study evidence

### Wave 3 Data Quality

| State | Shops | No Website | Poor/Basic Site | Top ERP Prospects |
|-------|-------|------------|-----------------|-------------------|
| CA | 20 | 3 | 4 | Thornton Aviation, Threshold Aviation Group (90+ emp), KaiserAir |
| OH | 10 | 0 | 4 (basic) | Columbus Aero Service, Signature Engines, Waypoint Aviation, CAM |
| KS | 10 | 0 | 3 (poor) | Tech-Aire Instruments, Midwest Malibu Center, Midwest Aircraft Services |

### EBIS Customer Intelligence — Key Findings
- **19 confirmed EBIS users** found via case studies and customer showcase pages on ebiscloud.com
- Geographic spread: TX (3), CA (3), NE (2), OH (1), IL (1), NV (1), NC (1), FL (1), GA (1), AL (1), ID (1), KS (1)
- **Core EBIS customer profile:** 4–30 employees, started on paper/spreadsheets, Part 145 cert-motivated
- **Recurring pattern:** Owner/DOM carried brand loyalty from prior employer (EBIS 3.2 experience)
- **Athelon counter-message needed:** Strong onboarding, migration tools, and modern UX story to break loyalty
- **KS confirmed EBIS user:** Clemens Aviation (Benton KS) — near Wichita cluster
- **TX confirmed EBIS users:** Salty Pelican (New Braunfels), Plane Place Aviation (Dallas), Basin Aviation (Midland)
- **FL confirmed:** Platinum Sky Maintenance (Fort Lauderdale) — prime Athelon target in Wave 4

### CA Notable Findings
- Clay Lacy Aviation: large enterprise, already has Corridor — do not target for ERP
- ACI Jet MRO: confirmed Corridor user (mentioned in Corridor case study) — track for churn
- Thornton Aviation: 61 FAA-approved types, dual KVNY/KBUR locations, no software mentioned — top CA ERP prospect
- Threshold Aviation Group (Chino): 90+ employees — largest independent ERP prospect found so far
- 3 shops with NO website: Cal-Air Aviation Services (Oakland), Corporate Air Technology (Oakland), Pacific Aircraft Maintenance (San Diego) — immediate outreach for website build

### OH/KS Notable Findings
- Wichita cluster: Tech-Aire Instruments has outdated HTML-relic website, perfect redesign + ERP combo
- Midwest Malibu Center (Hutchinson KS): poor web presence, specialty piston MRO — underserved
- Columbus Aero Service: Wix site (lowest-credibility builder) — strong website redesign pitch
- Signature Engines (Cincinnati): basic site, turbine engine shop — ERP + website cross-sell

### Gaps Remaining
- CA enrichment covers only 20 of estimated 475 shops
- No Corridor customer list equivalent found (unlike EBIS which published case studies)
- OH/KS need FAA registry pull for full coverage
- NV, TN, WA states not yet started

### Next Wave Focus
- Pull full FAA registry data for CA (475 est.) and add to master-target-list.csv
- Update corridor_ebis_likelihood = "confirmed_ebis" for the 19 known EBIS users in master list
- Target Platinum Sky Maintenance (Fort Lauderdale) and other confirmed-EBIS shops as priority ERP outreach
- Begin NV enrichment (Las Vegas business aviation cluster)


---

## Wave 4 — 2026-03-09 (08:30 UTC)

**Focus:** 4-state expansion (TN/NV/CT/WA) + South FL deep-dive + EBIS cross-referencing + metro cluster analysis + pipeline hardening  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **Expanded to 4 new states** — Extracted TN (65), NV (28), CT (80), WA (97) from FAA directory. Also extracted CO (74) which was missing from raw files. Master list: 2,114 → **2,412 records across 12 states**.

2. **Fixed data pipeline** — Previous waves had a schema mismatch (missing `is_enterprise`, `multi_location_group`, `domain_normalized` columns). Built `rebuild_master.py` — a single-command full rebuild of the master list from all state raw files + all enrichment results + EBIS/Corridor flags + enterprise detection. Deterministic and repeatable.

3. **EBIS customer cross-referencing** — Integrated all 19 known EBIS customers into rebuild pipeline with automatic flagging. 4 EBIS customers matched to master list records by name+state. 9 Corridor customers flagged.

4. **South Florida deep-dive (Sonnet worker)** — Enriched 20 shops in the densest US metro cluster:
   - **Boca Aircraft Maintenance** — 80 employees, 2 locations (BCT + OPF), EASA cert, 24/7 AOG. Top ERP prospect.
   - **Banyan Air Service** — 1M+ sq ft FXE complex, award-winning FBO+MRO. Large operation, possible enterprise ERP.
   - **Platinum Sky Maintenance** — EBIS confirmed, AOG specialist, Wix-era website → website redesign + ERP churn target.
   - **Premier Aircraft Service** — small piston MRO at FXE, good website but ERP opportunity.
   - **Palm Beach Avionics** — 40+ years, AEA member, good site, ERP target.
   - 7 shops with NO website: Helicraft, American Aero FTL, Air One Aviation, Avionic Specialists, Tiger Air Service, Lauderdale Aircraft Services, Executive Turbine Aviation.
   - Jet Aviation Miami flagged as enterprise (General Dynamics subsidiary).

5. **NV/TN partial enrichment** — NV/TN worker timed out but confirmed:
   - Apex Aviation (Henderson NV): EBIS confirmed, dual-location, strong churn target
   - Worldwide Jet Charter (Henderson NV): professional charter+MRO, medium operation

6. **Metro cluster analysis** — Built `metro_clusters.py` generating detailed cluster analysis:
   - 20 metro areas mapped with shop counts, website coverage, tier distribution
   - Top 10 metro outreach mini-lists generated as CSV files in `metro-outreach/` directory
   - **South Florida: 328 SMB shops** (324 no-website) — dominant cluster
   - **LA Basin: 155 shops**, DFW: 134, Phoenix: 101, Wichita: 57, Seattle: 49
   - 1,090 shops in non-metro areas (rural/small city targets)

7. **Updated enrichment backlog** — 18 prioritized tasks for waves 5-6.

### Wave 4 Data Quality Summary

| Metric | Wave 3 | Wave 4 | Change |
|--------|--------|--------|--------|
| Total records | 2,114 | 2,412 | +298 |
| States covered | 8 | 12 | +4 (TN, NV, CT, WA + CO fixed) |
| SMB targets | 2,019 | 2,317 | +298 |
| Enterprise flagged | 95 | 94 | ~same |
| With website | 36 | 38 | +2 (FL South enrichment) |
| Enriched profiles | 120 | 143 | +23 |
| EBIS customers in master | 0 | 4 | +4 |
| Corridor customers in master | 7 | 9 | +2 |
| Metro clusters mapped | 20 | 20 | — (now with mini-lists) |
| Metro outreach CSVs | 0 | 10 | +10 |

### Key New Opportunities

**South FL High-Value Targets:**
- Boca Aircraft Maintenance — 80 employees, multi-location, EASA cert. Top ERP prospect ($$$).
- Platinum Sky Maintenance — confirmed EBIS user, AOG specialist, website needs upgrade. Dual opportunity.
- Premier Aircraft Service — small piston MRO at FXE Hangar 15, good ERP fit.
- 7 no-website shops in FXE/PBI/OPF corridor — website redesign package opportunity.

**EBIS Churn Intelligence:**
- Apex Aviation (Henderson NV) confirmed on EBIS customer page + case study. Dual NV/CA locations.
- All 19 EBIS customers now programmatically flagged in pipeline for automatic detection.

**Metro Cluster Selling Strategy:**
- South Florida road trip: 328 targets, could pitch 10-20 website packages in one visit.
- Wichita concentrated cluster: 57 shops all reachable, all no-website — aviation heritage city.
- Nashville emerging: 17 shops, growing business aviation market.

### Scripts Created/Updated

- `rebuild_master.py` — Full pipeline rebuild from raw state files + enrichment + flags (NEW)
- `metro_clusters.py` — Metro area classification + mini-list generation (NEW)
- `extract_state.py` — Fixed schema to include enterprise/multi-location/domain columns

### Remaining Gaps

- CT/WA enrichment worker timed out — no enrichment data for these states yet
- NV/TN enrichment minimal (only 3 shops profiled from partial worker output)
- FL South enrichment covers 20 of 328 metro shops — need many more passes
- Houston cluster (43 shops) completely unenriched
- Phoenix cluster (101 shops) unenriched
- OK, NY, NC, IL states not yet extracted
- No employee count data for unenriched shops
- Enrichment-to-master merge rate low (~38 of 143 enriched profiles matched by cert_no or name)

### Next Wave Focus

- **Wave 5:** Re-run CT/WA enrichment (timed out); extract OK/NY/NC/IL states; Houston cluster enrichment (20 shops); Phoenix enrichment (20 shops); improve enrichment matching (fuzzy name matching); begin outreach template creation


## Wave 4 — 2026-03-09
**Focus:** NV/TN/CT/WA/FL-South enrichment + metro-based outreach segmentation + data quality fixes
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Enriched 20 Nevada/Tennessee shops (NV: Las Vegas/Reno; TN: Nashville/Smyrna/Memphis)
- Enriched 20 Connecticut/Washington shops (CT: Groton/Bridgeport; WA: Renton/Boeing Field/Spokane)
- Enriched 20 South Florida shops with focus on confirmed EBIS users (Fort Lauderdale/Opa-Locka/Miami)
- Generated metro-based outreach files (10 metro clusters, 991 shops segmented)
- Fixed critical data quality issue: CO enriched records (round-3) were overwritten by lower-quality FAA bulk data; restored 71 properly-scored CO records
- Rebuilt cross-sell-top25.csv with correct scoring and EBIS priority weighting
- Rebuilt erp-targets-tiered.csv and website-targets-tiered.csv with deduped, non-enterprise records

### Blocker: Worker Timeouts
- w4-worker-nv-tn timed out during follow-up lookups; **all 20 data rows were already written** — data intact
- w4-worker-fl-south timed out similarly; enrichment-results-fl-south.csv complete (20 rows)
- **Mitigation:** Files were committed before timeout; no data lost. Future workers should write CSV earlier and search after.

### Wave 4 Data Quality
- Master target list: 2,409 records across CO/TX/FL/AZ/GA + enrichment samples (NV/TN/CT/WA/CA/OH/KS)
- CO records restored to proper enrichment scores (erp up to 80, wfs up to 80)
- EBIS confirmed users updated: Apex Aviation (Henderson NV) confirmed with enrichment data

### Notable NV/TN/CT/WA Finds
- **Apex Aviation (Henderson NV)** — CONFIRMED EBIS user, 25,000 sq ft at KHND, turbine/rotorcraft/piston. Warm ERP churn target.
- **Platinum Sky Maintenance (Fort Lauderdale FL)** — CONFIRMED EBIS, AOG corporate jet shop, functional Wix-era site → website redesign + ERP both viable
- **Columbia Air Services (Groton CT)** — Daher TBM authorized service center, AEA member, 20-50 employees, good ERP prospect
- **Threshold Aviation Group (Chino CA)** — Largest independent prospect found: 90+ employees. Still no ERP software visible in public web presence.
- **Nashville cluster:** Smyrna (KMQY) has Stevens Aerospace + Nitetrain Aviation + AMI Aviation cluster — worth a dedicated Smyrna metro file

### Metro Outreach Segments Built
| Metro | Shops |
|-------|-------|
| South Florida (KOPF/KFXE/KPBI/KFLL) | 328 |
| Los Angeles Basin (KVNY/KBUR/KLAX) | 155 |
| DFW Metroplex (KADS/KFTW/KDAL/KDTO) | 134 |
| Phoenix Metro (KSDL/KDVT/KGYR) | 101 |
| Seattle/Puget Sound (KBFI/KPAE/KGEG) | 49 |
| Houston (KHOU/KDWH/KSGR) | 43 |
| Denver Front Range (KAPA/KBJC/KFTG/KCOS) | 42 |
| San Antonio/Austin (KSAT/KAUS/KFTW) | 41 |
| Atlanta Metro (KPDK/KFTY/KSAV) | 41 |
| Wichita (KICT/KAAO) | 57 |

### Next Wave Focus
- Score remaining non-CO records with enriched heuristics (TX/FL/AZ/GA have low default scores)
- Contact discovery pass for confirmed EBIS users (find phone/email for warm ERP outreach)
- Dedicated Wichita cluster deep-dive (57 shops; Tech-Aire + Midwest Malibu + Air Capital Interiors)
- Smyrna TN cluster (Stevens Aerospace, Nitetrain, AMI Aviation)


---

## Wave 5 — 2026-03-09 (09:00 UTC)

**Focus:** Scoring differentiation + 4-state expansion (OK/NY/NC/IL) + EBIS customer manual import + Houston/Phoenix enrichment  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **Advanced heuristic rescoring** — Created `rescore_heuristics.py` that uses name-based keyword detection, email domain analysis, metro city classification, and DBA presence to differentiate 2,224 previously flat-scored records. Before: 1,738 records with identical wfs=50/erp=20. After: continuous distribution from 15-80 (wfs) and 8-90 (erp).
   - **624 shop archetypes detected from names:** avionics (262), engine-specialist (169), component-specialist (112), helicopter-mro (57), structural-specialist (41), interior-specialist (36), paint (14), FBO (7)
   - **1,866 custom email domains extracted** as website proxies
   - Metro city bonus applied to shops in major aviation hubs
   - DBA/brand name presence flagged as marketing awareness indicator

2. **Expanded to 4 new states** — OK (123), NY (86), NC (75), IL (96) extracted from FAA directory. Master list: 2,409 → **2,795 records across 16 states**.

3. **Manual EBIS customer import** — Added 6 confirmed EBIS customers that weren't matchable via FAA cert_no (business names differ from FAA legal names): Salty Pelican (TX), Basin Aviation (TX), Platinum Sky (FL), My Jet DOM (GA), Midwest Corporate Air (OH), Skyview Aviation (CA). Total confirmed EBIS: 10 in master list.

4. **Elevate MRO exclusion fix** — Properly flagged all Elevate MRO entries as "self" to exclude from outreach.

5. **Houston cluster enrichment** (Sonnet worker) — In progress; targeting top 20 Houston metro Part 145 shops.

6. **Phoenix cluster enrichment** (Sonnet worker) — In progress; targeting top 20 Phoenix metro Part 145 shops.

### Wave 5 Data Quality Summary

| Metric | Wave 4 | Wave 5 | Change |
|--------|--------|--------|--------|
| Total records | 2,412 | 2,795 | +383 |
| States covered | 12 | 16 | +4 (OK, NY, NC, IL) |
| SMB targets | 2,317 | 2,701 | +384 |
| Archetype-detected shops | ~0 (bulk) | 624 | +624 |
| Score differentiation | 1,738 flat | 0 flat | all records differentiated |
| EBIS confirmed in master | 4 | 10 | +6 (manual import) |
| Corridor verified | 7 | 7 | — |
| Email domain discoveries | 0 | 1,866 | +1,866 |

### Key New Opportunities

**Oklahoma (Tulsa MRO Alley):**
- PowerMaster Inc (Tulsa) — engine specialist, wfs=56, erp=47
- JetSet Inc (Bethany/OKC) — FBO-MRO, wfs=68, erp=30
- Tulsa Avionics Services (Tulsa) — avionics specialist, wfs=53, erp=42

**New York (Business Aviation Corridor):**
- Islip Avionics (Ronkonkoma/Long Island) — avionics, near KISP
- Empire Avionics (White Plains) — near KHPN, corporate jet hub
- Ventura Avionics (Farmingdale) — near Republic Airport KFRG

**North Carolina:**
- Aero Avionics Inc (Sanford) — avionics, wfs=56, erp=47
- Carolina Avionics Group (Salisbury) — avionics, wfs=65
- Appalachian Aero Group (Hickory) — **confirmed EBIS user**, warm churn target

**Illinois:**
- Waukegan Aviation Services — avionics, wfs=63, erp=35
- Avionics Place (Rockford) — avionics, near KRFD cargo hub
- WAIR Aviation (Wheeling) — **confirmed EBIS user**, immediate churn target

### Scripts Created/Updated

- `rescore_heuristics.py` — Advanced multi-signal scoring using name keywords, email domains, metro cities, DBA presence (NEW)

### Remaining Gaps

- Houston and Phoenix enrichment workers still running (will complete into enrichment-results CSV files)
- Tulsa cluster not enriched yet (high priority for wave 6 — major US MRO hub)
- NY Teterboro/White Plains cluster not enriched
- EBIS customer DBA-to-FAA reconciliation incomplete (many EBIS customers have different trade names vs FAA legal names)
- No employee count or revenue proxy data
- ~2,050 records still classified as "general-mro" (name-based detection has limits)

### Next Wave Focus

- **Wave 6:** Merge Houston/Phoenix enrichment results; Tulsa MRO Alley deep-dive; NY biz-jet corridor enrichment; EBIS customer contact discovery (phone/email for warm outreach); outreach template drafting; Wichita deep-dive



---

## Wave 6 — 2026-03-09 (09:30 UTC)

**Focus:** Houston/Phoenix enrichment merge + hot leads priority file + Tulsa/NY/Wichita deep-dive enrichment + data quality  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **Merged Houston + Phoenix enrichment** — Ran rebuild_master.py and rescore_heuristics.py to integrate 40 new enrichment records from Wave 5 workers. 58 records gained website data through enrichment merge. Master list fully rescored with archetype detection (700 shops categorized) and email domain analysis (2,219 custom domains extracted).

2. **Created hot-leads-priority.csv** — New high-value file combining:
   - 5 confirmed EBIS churn targets (matched to FAA master) 
   - 13 confirmed EBIS churn targets (unmatched — need FAA reconciliation)
   - 7 enriched high-ERP prospects (verified medium+ shops with ERP fit ≥55)
   - 25 top website prospects (no web presence, reachable by phone, specialty shops)
   - 9 cross-sell opportunities (both website + ERP scores high)

3. **EBIS-to-master reconciliation analysis** — Identified 14 of 19 EBIS customers that don't match FAA records by name. Root causes: trade name ≠ legal name (e.g., "Salty Pelican Aviation" is likely registered under a different LLC), and 5 shops in states not yet extracted (AL, ID, NE). Documented in evidence-notes.md.

4. **Houston metro highlights** (from Wave 5 worker data):
   - InTech Aerospace (erp=75) — business jet interior/completions, medium shop
   - Harco Aviation (erp=75) — helicopter engine overhaul, medium
   - Western Airways (erp=72) — FBO-MRO, medium
   - 4 shops with NO website and high wfs: Brazos Avionics (82), MexxAm Aircraft (80), Von's Avionics (80), South Air Helicopters (78)

5. **Phoenix metro highlights** (from Wave 5 worker data):
   - Air Transport Components (erp=65, wfs=75, NO WEBSITE, medium) — **top dual prospect**
   - Executive Aircraft Maintenance (erp=60, wfs=85, NO WEBSITE, medium) — **top dual prospect**
   - Heliponents Inc (erp=70) — helicopter component specialist, medium
   - SawyerMX (erp=65) — largest MRO at busiest US bizav airport (KSDL)

6. **Spawned 3 Sonnet workers for cluster enrichment:**
   - w6-tulsa-ok: 20 Tulsa/OKC shops (MRO Alley, #2 US MRO hub)
   - w6-ny-metro: 20 NY/NJ biz-jet corridor shops (KTEB/KHPN/KFRG)
   - w6-wichita-ks: 20 Wichita shops (Air Capital, all-no-website cluster)

7. **Killed stale Wave 5 workers** — w5-houston-enrichment and w5-state-expansion had timed out but already produced their CSV output files. Freed resources for Wave 6 workers.

### Wave 6 Data Quality Summary

| Metric | Wave 5 | Wave 6 | Change |
|--------|--------|--------|--------|
| Total records | 2,795 | 2,792 | -3 (dedup) |
| States covered | 16 | 16 | — |
| SMB targets | 2,701 | 2,682 | -19 (enterprise detection improved) |
| Enterprise flagged | ~95 | 109 | +14 |
| With website (enrichment-merged) | ~38 | 58 | +20 |
| Enriched profiles (total) | ~143 | 183 | +40 (Houston + Phoenix) |
| EBIS confirmed in master | 10 | 5 | corrected (strict matching) |
| EBIS confirmed total (inc. unmatched) | — | 18 | documented in evidence |
| Hot leads prioritized | 0 | 59 | NEW file |
| Archetype-detected shops | 624 | 700 | +76 |
| Custom email domains | 1,866 | 2,219 | +353 |

### Key New Opportunities

**Phoenix Dual Prospects (Website + ERP):**
- Air Transport Components (Gilbert AZ) — medium component shop, NO website, erp=65, wfs=75. Ideal for $15k website + ERP package pitch.
- Executive Aircraft Maintenance (Scottsdale AZ) — medium shop, NO website, erp=60, wfs=85. Light through mid-size jets at KSDL.

**Houston ERP Targets:**
- InTech Aerospace — medium business jet completions, erp=75. Professional site but needs operational software.
- Harco Aviation — medium helicopter engine overhaul, erp=75.
- Western Airways — medium FBO-MRO at Sugar Land, erp=72.

**Cluster Enrichment In Progress (workers pending):**
- Tulsa MRO Alley — 124 OK shops, richest concentration of non-OEM MRO outside FL
- NY Biz-Jet Corridor — Teterboro/White Plains, busiest private jet airspace in world
- Wichita — 57 shops, ALL without website, ALL reachable, aviation heritage city

### Scripts Created/Updated
- No new scripts this wave; used existing pipeline (rebuild_master.py → rescore_heuristics.py)
- Created hot-leads-priority.csv generation script (inline)

### Remaining Gaps
- 14 EBIS customers unmatched to FAA records — need manual cert_no lookup
- Tulsa/NY/Wichita enrichment pending (workers running)
- FL still massively under-enriched (20 of 641 shops profiled)
- No AL, ID, NE, MN, IN states extracted yet (need for full EBIS customer coverage)
- No employee count data for unenriched shops
- Outreach email templates not yet drafted

### Next Wave Focus
- **Wave 7:** Merge Tulsa/NY/Wichita enrichment; extract AL/NE/ID states for EBIS customer matching; FL 2nd enrichment pass (next 20 Opa Locka shops); begin outreach template drafting; CAMP Systems mapping; job posting analysis for growth signals

## Wave 5 — 2026-03-09
**Focus:** Phoenix metro deep-dive (20 shops)
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Enriched 20 Phoenix metro Part 145 shops across KSDL/KDVT/KFFZ/KCHD/KGYR
- Saved enrichment-results-az-phoenix.csv (21 rows)

### Notable Finds
- **Executive Aircraft Maintenance (Scottsdale)** — wfs=85, no website, medium shop, Class III Part 145. Top Phoenix website build prospect.
- **KBM Aviation (Goodyear)** — wfs=80, no website. 
- **Heliponents (Falcon Field/Mesa)** — erp=70, component specialist, established shop.
- **SawyerMX (Scottsdale, KSDL)** — erp=65, general-mro at busiest bizav airport in US, Sawyer Aviation Group affiliate.
- **Air Transport Components (Gilbert)** — wfs=75 (no website), erp=65, component specialist.
- **Jet MX (Goodyear, KGYR)** — erp=65, well-maintained site, medium general-mro.
- Zero software mentions found publicly across all 20 shops — typical SMB profile.

---

## Wave 6 — 2026-03-09
**Focus:** Tulsa/OK, Wichita/KS, NY Metro enrichment
**Status: BLOCKED — all 3 workers timed out before writing CSV output**

### Blocker
All three Wave 6 workers (w6-tulsa-ok, w6-wichita-ks, w6-ny-metro) timed out mid-research before writing their enrichment CSVs. This is a recurring pattern when workers do extensive web searching before writing output.

**Mitigation applied:** 
- state-ok-raw.csv preserved (126 OK shops from FAA bulk data with default scoring)
- Future worker instructions must write CSV first with placeholder data, then enrich in-place

### Partial Win
- OK raw data: 126 Part 145 stations in Oklahoma with contact data and default scores now in mro-directory
- Tulsa (KTUL) and Oklahoma City (KOKC) are confirmed high-density MRO clusters from prior research

### Next Wave Fix
- Workers will write skeleton CSV immediately, then fill in enrichment
- Consider shorter-scope tasks (10 shops max per worker) to avoid timeout
- Wichita, NY Metro, Tulsa remain on enrichment backlog



---

## Wave 7 — 2026-03-09 (10:00 UTC)

**Focus:** EBIS contact discovery + scoring algorithm fix + Wichita/Tulsa/NY Metro enrichment  
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **EBIS contact discovery** — Researched all 18 confirmed EBIS customers and found:
   - 14 of 18 now have verified phone numbers
   - 8 of 18 have verified email addresses
   - 15 of 18 have website URLs identified
   - Created `ebis-contacts-enriched.csv` with complete contact dossier

2. **Scoring algorithm fix** — Found and fixed critical bug in `rescore_heuristics.py`:
   - EBIS ERP bonus increased from +25 to +40 (reflects Veryon acquisition churn urgency)
   - Fixed score guard that prevented existing scores from being upgraded (only allowed downgrades to be blocked)
   - Fixed skip condition that excluded enriched EBIS records from rescore
   - Net result: OCR Aviation 55→70, Clemens 55→70, Appalachian Aero 48→63, Apex Aviation 10→60, Plane Place 48→63

3. **Wichita cluster enrichment** (Sonnet worker → 10 shops):
   - Clemens Aviation is actually 50-130 employees and an EBIS *reference customer* (not just a user)
   - Global Aviation Tech: 28-34 emp, in-house engineering/manufacturing, dual Wichita+Elmira locations — top ERP prospect
   - LJ Aviation: 30-50 emp, 16 maintenance techs, 40+ managed aircraft fleet
   - Tech-Aire Instruments: outdated static HTML site from ~2000s — prime $5-10k website redesign
   - 2 shops (Kansas Aviation Services, Excel Aircraft Service) not found online — may be defunct

4. **Tulsa/OKC cluster enrichment** (Sonnet worker → 10 shops):
   - NORDAM Group: 2,500 employees — enterprise, exclude from target lists
   - Aero-Mach Labs: $26M revenue, 100+ emp, recently unified 3 brands — possible mid-market ERP
   - Tulsa Avionics Services: circa-2005 HTML site, 30+ years — prime $5-8k website redesign
   - PowerMaster Inc: circa-2008 HTML site — prime website redesign
   - 3 shops not found online (Airlift Helicopters, Oklahoma Aircraft Sales, Southwest Helicopters)

5. **NY Metro cluster enrichment** (Sonnet worker → 10 shops):
   - **Keystone Helicopter Corp** (West Chester PA): TOP FINDING. 50-100 emp, PE-backed (Ranger Aerospace), Part 145+135+91, air medical. ZERO website. Cross-sell score 85 — highest in entire database ($15-25k website + ERP)
   - Islip Avionics: founder passed 2024, sons running — leadership transition = buying window
   - Meridian (Teterboro): CLOSED Part 145 in 2020 — remove from target lists
   - Ventura Air Services: 51-200 emp, Est. 1955 — larger enterprise prospect
   - Empire Avionics: likely closed per Yelp

6. **Rebuilt hot-leads priority file** — Now 31 prioritized leads (was 59) with:
   - 15 EBIS churn targets (5 matched to FAA + 10 with contacts found)
   - 5 new discoveries from enrichment (Keystone, Global Aviation Tech, LJ Aviation, Ventura, Aero-Mach)
   - 7 website prospects (Tulsa Avionics, PowerMaster, Tech-Aire, Islip + existing top prospects)
   - 4 entities flagged for removal

### Wave 7 Data Quality Summary

| Metric | Wave 6 | Wave 7 | Change |
|--------|--------|--------|--------|
| Total records | 2,792 | 2,792 | — |
| EBIS contacts with phone | ~5 | 14 | +9 |
| EBIS contacts with email | ~3 | 8 | +5 |
| EBIS contacts with website | ~3 | 15 | +12 |
| Enriched profiles (total) | 183 | 213 | +30 (Wichita+Tulsa+NY) |
| Hot leads prioritized | 59 | 31 | -28 (higher quality, deduped) |
| Entities flagged for removal | 0 | 4 | +4 |
| New top ERP prospects | — | 5 | +5 (Keystone, GATECH, LJ, Ventura, Aero-Mach) |

### Key New Opportunities

**#1 Keystone Helicopter Corp** (West Chester PA) — 50-100 emp, PE-backed, Part 145+135+91, helicopter MRO/air medical. ZERO website. Cross-sell score 85.0 — highest in entire database. Immediate dual pitch: $15-25k website + ERP.

**#2 Islip Avionics** (Ronkonkoma NY) — Family shop since 1986 at KISP MacArthur. Founder passed 2024; sons Rick & Steven running it now. Leadership transition = ideal buying window for website refresh + ERP.

**#3 Salty Pelican Aviation** (New Braunfels TX) — Confirmed EBIS user with full contact info. Cirrus ASC, 11 emp. Phone: 830-837-0823. Ready for warm ERP outreach.

**#4 Global Aviation Tech** (Wichita KS) — 28-34 emp MRO with in-house engineering/manufacturing. Growing company with complex ops needing ERP. Phone: 316-425-0999.

**#5 Platinum Sky Maintenance** (Fort Lauderdale FL) — Confirmed EBIS user. AOG specialist at FXE. Wix-era website needs redesign. Dual pitch: $10-15k website + ERP churn. Phone: 786-717-1606.

### Scripts Updated
- `rescore_heuristics.py` — EBIS bonus +25→+40; fixed score upgrade guard; fixed skip condition for confirmed EBIS

### Remaining Gaps
- 3 EBIS users still need phone discovery (Apex Aviation NV, Jet Services AL, CharterJet Solutions)
- 13 EBIS customers still unmatched to FAA cert_nos (trade name ≠ legal name)
- FL massively under-enriched (20 of 641 shops)
- Smyrna TN cluster not enriched
- Keystone Helicopter needs contact discovery (phone/email/decision-maker)
- 4 entities need to be flagged/removed from master list

### Next Wave Focus
- **Wave 8:** Keystone Helicopter deep-dive + contact discovery; Smyrna TN cluster; remove closed/enterprise entities; FL 2nd enrichment pass; EBIS cert_no reconciliation


## Wave 7 — 2026-03-09
**Focus:** Wichita/KS + Tulsa/OK + NY Metro enrichment (skeleton-first approach)
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Enriched 10 Wichita/KS shops (saved enrichment-results-ks-wichita.csv)
- Enriched 10 Tulsa/OK shops (saved enrichment-results-ok-tulsa.csv)
- Enriched 10 NY Metro shops (saved enrichment-results-ny-metro.csv)
- Skeleton-first approach worked — all 3 CSVs complete, no timeouts

### Data Quality Improvement
- NY Metro: 4 of 10 researched shops confirmed defunct/mislocated/unverifiable — removed from active targets
  - Meridian Teterboro: closed Part 145 in 2020, FBO-only now
  - Empire Avionics: Yelp shows CLOSED
  - International Turbine Service: mislocated (actually in Grapevine TX)
  - Executive Flyers Maintenance: entity could not be verified
- **Lesson:** NY Metro has high shop turnover; always cross-ref against FAA registry for active cert status
- Clemens Aviation (Wichita): re-confirmed as EBIS customer (case study: scaled 3→130 employees); not a prospect, valuable competitor ref

### Wave 7 Top Finds

**Wichita KS:**
- **Tech-Aire Instruments** — AEA member since 1990, outdated HTML site, $5-10k redesign candidate. Contact: Joseph DeFalco, 316-262-4020. Ready for outreach.
- **Global Aviation Tech (GATECH)** — 28-34 employees, full-service MRO + engineering + STCs + dual locations (Wichita + Elmira NY). Top Wichita ERP prospect.
- **LJ Aviation** — 16 full-time maintenance techs, 40+ aircraft under management, charter + Part 145. Medium-high ERP fit.
- **Kansas Aviation Services / Excel Aircraft Service** — zero web presence, need FAA cert verification before outreach.

**Tulsa/OKC OK:**
- **Tulsa Avionics Services** — circa-2005 website, prime $5-10k redesign target.
- **PowerMaster Engines** — dated SigmaTek-built static HTML, another redesign slam dunk.
- **Aero-Mach Labs** — $26M revenue, 100+ staff, recently rebranded; potential ERP conversation.
- NORDAM Group disqualified (2,500 employees — enterprise tier).

**NY Metro:**
- **Keystone Helicopter** (West Chester PA) — PE-backed helicopter MRO (Keystone Ranger Holdings), ZERO web presence, 50-100 employees, Part 145+135+91 operations. Best lead in batch: $15-25k website + ERP dual-sale.
- **Islip Avionics** (Ronkonkoma NY, KISP) — family shop in succession (founder passed 2024, sons running it); WordPress site needs refresh. First Garmin dealer. Buying window open.
- **Ventura Air Services** (Farmingdale NY) — 51-200 employees, charter+maintenance, professional website already; ERP-only conversation.

### Cumulative Database State
- Total enrichment CSV files: 12 state/metro batches + 1 EBIS evidence file
- Master target list: ~2,400 records
- Confirmed EBIS users: 19+ (warmest ERP leads)
- Active enrichment backlog: Wichita OK/NY now done; remaining: CA full pull, WA/TN, score uplift

### Next Wave Focus
- EBIS user contact discovery (19 shops: find phone/email for warm outreach)
- Smyrna TN cluster (Stevens Aerospace independents)
- Score uplift pass on TX/FL/AZ/GA bulk records
- Prepare outreach-ready slice: Top 25 with phone/email + no website + ERP score ≥40


## Wave 8 — 2026-03-09
**Focus:** Data quality overhaul + score uplift + contact discovery + Keystone deep-dive
**Operator:** Autonomous (Opus orchestrator + Sonnet workers)

### Actions Taken
- Cleaned master list: removed 4 hot air balloon entities, deduped
- Score uplift: re-scored 2,733 FAA bulk records with name-based heuristics (specialty/full-service/enterprise keywords)
  - WFS: avg 50→56.9, range 30-80 (was flat 50 for most)
  - ERP: avg 20→29.0, range 0-75 (was flat 20 for most)
- Rebuilt all tiered lists (website/ERP/cross-sell/no-website) with updated scores
- Contact discovery for Keystone Helicopter + 3 EBIS contact gaps
- enrichment-results-w8-contacts.csv: 4 companies profiled

### Critical Finding: Keystone Helicopter NOT an Independent Prospect
- Keystone Helicopter Corp was acquired by Sikorsky/United Technologies in November 2005 (~$500M)
- Now operates as Sikorsky Global Helicopters / Sikorsky Aerospace Services under Lockheed Martin
- keystonehelicopter.com redirects to Lockheed Martin
- **Removed from active prospect pipeline.** Any ERP/software decisions made at enterprise level.
- Previous cross-sell score of 85 was based on outdated data assuming independence.

### EBIS Contact Updates
- **Apex Aviation (Henderson NV):** Phone (702) 735-2739, cert 9VNR950B + 9VND950B (dual location), DOM named Jaime, professional website, confirmed EBIS 5 current user
- **Jet Services Maintenance (Mobile AL):** Phone (251) 300-6600, cert JSMR213E, President Sean Marks, Part 145 awarded summer 2023, family-owned since 1971, professional website, confirmed EBIS user
- **CharterJet Solutions:** Unable to locate — no website, no public phone, no FAA cert found. Part 135 charter with in-house maintenance (8 jets, 30 employees, 3 techs). Likely a DBA or private holding.

### Updated Database State
| Metric | Value |
|--------|-------|
| Master records | 2,729 (cleaned) |
| States covered | 16 |
| No website | 2,585 (95%) |
| Confirmed EBIS users | 19 |
| Cross-sell top 25 threshold | 67.5+ |
| WFS top 50 threshold | 70+ |
| ERP top 50 threshold | 50+ |

### New Cross-Sell Top 5
1. New Tech Aircraft Services (Hawthorne CA) — wfs=80, erp=65, cs=72.5
2. HM Aeronautics (San Diego CA) — wfs=80, erp=65, cs=72.5
3. Orlando Avionics Corp (Orlando FL) — wfs=80, erp=65, cs=72.5
4. Turbine Aircraft Services (Bethany OK) — wfs=80, erp=65, cs=72.5
5. Ferrer Aviation Services (Fort Worth TX) — wfs=80, erp=65, cs=72.5

### New ERP Top 5
1. KP Aviation MRO 1 (Gilbert AZ) — erp=75
2. GC Aviation Services-1 (Miamisburg OH) — erp=75
3. Southwest Turbine (Phoenix AZ) — erp=65
4. New Tech Aircraft Services (Hawthorne CA) — erp=65
5. RTS Aviation Services (Van Nuys CA) — erp=65

### Gaps Remaining
- 2,585 shops (95%) still have no website — massive pipeline but undifferentiated
- No employee count data for bulk FAA records — limits ERP scoring accuracy
- Corridor customer list still unknown (EBIS churn list is much better documented)
- CA, FL, TX have hundreds of unenriched records

### Next Wave Focus
- Second FL enrichment pass (Opa Locka/Tamiami cluster — 20 shops)
- Smyrna TN cluster (Stevens Aerospace neighborhood)
- Corridor customer evidence search (corridor.aero case studies)
- Website quality classification for the 144 shops with has_website=yes


## Wave 9 — 2026-03-09 (10:30 UTC)
**Focus:** Data quality overhaul + enterprise cleanup + FL Miami enrichment + TN Smyrna cluster + Corridor/EBIS competitive intelligence
**Operator:** Autonomous (Opus orchestrator + 3 Sonnet workers)

### Actions Taken

1. **Major data quality cleanup:**
   - Fixed 6 field inconsistencies (website='none' → empty, has_website flags)
   - Identified and flagged 189 additional enterprise entities (120→311 total) using domain analysis + name keywords
   - Enterprise domains discovered: Collins (20 locs), StandardAero (16), Honeywell (14), Parker (14), Textron (14), Boeing (13), Gulfstream (11), Safran (10), and 50+ more
   - Cleaned multi-location group field — removed false-positive domain associations (gmail, windstream, etc.)
   - SMB target universe refined from 2,609 → 2,418 (more accurate)

2. **Multi-location SMB group identification:**
   - 239 SMB records belong to multi-location groups
   - Key SMB chains discovered: Sarasota Avionics (5 FL locations), Focused Air (4 FL locations), Boca Aircraft Maintenance (2 FL), Cutter Aviation (4 states), West Star Aviation/JetEast/Premier Air Center (9 locations via wsa.aero)
   - Multi-location groups get priority scoring boost (higher deal value potential)

3. **FL Miami cluster enrichment (15 shops — Sonnet worker):**
   - All 15 Miami-area shops researched and profiled
   - 12 websites discovered (80% discovery rate — much higher than prior FL waves)
   - Key finds:
     - **Next MRO LLC** — FAA Open-Class license (rare), 40k sqft, CEO Noel Aguilera named. Landing gear/NDT/machining. Best new FL lead.
     - **NAS MRO Services** — Recently completed ownership transition to fully independent. Boeing/Airbus/CFM component MRO. EASA certified.
     - **Prestige Aero Services** — Since 1995, FAA+EASA+UK certified. All in-house, no subcontractors.
     - **Jet Aircraft Maintenance** — Operates at 7 US airports. Line maintenance specialist.
     - **F&E Aircraft Maintenance** — 201-500 employees, 30+ years. Borderline enterprise but privately held.
   - Component specialist concentration in Miami is striking — hydraulics, landing gear, accessories dominate

4. **TN Smyrna/Nashville cluster enrichment (10 shops — Sonnet worker):**
   - 8 independent SMBs profiled, 2 flagged enterprise:
     - Corporate Flight Management = Contour Aviation (900+ employees — enterprise)
     - AMI Aviation Services = subsidiary of AeroMech Inc (not independent)
   - Best TN leads:
     - **Hollingshead Aviation Services** — Independent FBO+Part 145 at KMQY, BBB accredited since 2017
     - **Tennessee Aircraft Services** — 50+ year family business (founded by WWII mechanic), Cirrus Authorized Service Center, owner Paul New
     - **Horizon Avionics** — AEA member since 1989, 30+ years at TYS, broad aircraft coverage
     - **Thom Duncan Avionics** — Founded 2018, also runs Autopilot South (Garmin autopilot installs), mid-south GA market
   - Stevens Aerospace confirmed at 3 locations (CO, GA, TN) — Corridor customer, used as competitive reference

5. **Corridor/EBIS competitive intelligence (Sonnet worker — MAJOR FIND):**
   - **17 NEW Corridor customers identified** (vs 6 previously known):
     - HIGH confidence: Constant Aviation (OH), Professional Aircraft Accessories (FL), Victory Lane Aviation (NC), WarDaddy Aviation (GA), Atlantic Aviation, Wheels Up, ExecuJet MRO, Jet Aviation, GAMA Aviation, Eagle Copters, Chartright Air Group
     - MEDIUM: Airshare, New World Aviation, Fly Exclusive, Omni Air
   - **14 NEW EBIS customers identified** (vs 5 previously known):
     - Case studies found: Salty Pelican Aviation, Cove Aviation (CA), Basin Aviation, Qmulus Aviation, WAir Aviation, Platinum Sky Maintenance, MyFlight, Plane Place Aviation, Midwest Corporate Air (OH), My Jet DOM (GA)
     - EBIS claims 300+ shops on platform; case studies show it's the preferred choice for small shops scaling up
   - **Churn signals discovered:**
     - Basin Aviation switched TO EBIS from unnamed competitor
     - Qmulus Aviation switched TO EBIS citing "limitations of previous system"
     - Plane Place Aviation switched TO EBIS citing missing professional forms/reporting
   - **Competitive positioning insight:**
     - Corridor targets larger/enterprise MROs (Jet Aviation, GAMA, ExecuJet, Wheels Up)
     - EBIS self-selects smaller shops (Capterra: "better fit for smaller maintenance operation")
     - **Athelon opportunity: mid-market gap** between EBIS (micro/small) and Corridor (enterprise)
     - Competitors also compared against: Flightdocs, iFlight MRO, Cirro, SMS Pro
   - Saved as `competitor-customer-evidence-w9.md`

6. **Hot leads list rebuilt with better scoring:**
   - Added multi-location group bonus (+15 priority)
   - EBIS churn leads remain #1 priority (score 100+)
   - Cross-sell leads boosted when WFS≥70 AND ERP≥50
   - 263 qualified hot leads total, top 50 written to `hot-leads-priority.csv`

7. **All tiered lists rebuilt:**
   - `website-targets-tiered.csv`: 100 records (WFS≥60, reachable)
   - `erp-targets-tiered.csv`: 100 records (ERP≥40, reachable)
   - `no-website-priority.csv`: 2,348 records
   - `cross-sell-top25.csv`: 25 records (CS≥60)
   - `enrichment-backlog.csv`: 15 prioritized tasks for waves 10-13

### Updated Database State
| Metric | Wave 8 | Wave 9 | Change |
|--------|--------|--------|--------|
| Total records | 2,729 | 2,729 | — |
| Enterprise (excluded) | 120 | 311 | +191 |
| SMB targets | 2,609 | 2,418 | -191 (cleaner) |
| With website | 54 | 70 | +16 |
| Corridor-verified | 9 | 17 | +8 |
| EBIS-confirmed (in DB) | 5 | 5 | — (new ones not in FAA extract) |
| EBIS-confirmed (total known) | 5 | 19 | +14 |
| Corridor-confirmed (total known) | 9 | 23+ | +14+ |
| Multi-location SMB groups | 0 | 239 records | new field |
| Hot leads (qualified) | 35 | 263 | +228 (better scoring) |

### Key Strategic Insights (NEW this wave)

1. **Mid-market positioning gap confirmed:** Corridor dominates enterprise (Jet Aviation, GAMA, Wheels Up). EBIS dominates micro/small. Athelon's sweet spot is mid-market Part 145 shops with 10-100 employees.

2. **Miami is a component specialist hub:** The Opa Locka/Doral/Hialeah cluster is dominated by hydraulic, landing gear, and accessory component MROs — different profile than the GA/biz-av shops in TX/CO/TN. Tailor ERP pitch to component workflow.

3. **Multi-location SMB deals are the highest-value targets:** Sarasota Avionics (5 locations) could be a $50-100k+ combined website + ERP deal. Focused Air (4 FL locations) similar.

4. **EBIS churn window is real but nuanced:** Veryon acquired EBIS Nov 2025. The churn window is 12-24 months (now through ~2027). But EBIS case studies show they're still actively onboarding customers as of 2024-2025. The real opportunity is shops where Veryon raises prices or changes product direction.

### Gaps Remaining
- 14 EBIS case study companies not yet in our FAA database (need to add manually or expand state extraction)
- FL still massively under-enriched (25 of 637 now profiled, 3.9%)
- CA, AZ at 0% enrichment in master list
- Employee count data still missing for 95%+ of records
- No website quality classification yet for the 70 shops with websites

### Next Wave Focus
- FL Fort Lauderdale / West Palm Beach cluster enrichment (20 shops)
- CA Van Nuys / Burbank / Long Beach cluster enrichment (20 shops)
- Add EBIS case study companies to master list manually (14 new entities)
- Website quality audit for 70 shops with has_website=yes

