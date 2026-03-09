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

