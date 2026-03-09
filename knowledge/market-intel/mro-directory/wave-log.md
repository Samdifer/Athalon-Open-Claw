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
