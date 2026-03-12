# Data Room Due Diligence Research

Research corpus on virtual data room (VDR) best practices for Fortune 500 private equity due diligence. Covers structure, PE workstream requirements, common pitfalls, and technology platform selection.

**Compiled:** March 2026

---

## Documents

| # | Document | Focus |
|---|---|---|
| 01 | [Data Room Structure & Organization](01-DATA-ROOM-STRUCTURE-AND-ORGANIZATION.md) | Folder taxonomy (15 categories, 3 levels deep), naming conventions, master index schema, prioritization tiers (Day 1 / Phase 2 / Confirmatory), cross-referencing system, PE firm-specific expectations (KKR, Blackstone, Apollo, Carlyle, Bain Capital) |
| 02 | [PE Due Diligence Requirements](02-PE-DUE-DILIGENCE-REQUIREMENTS.md) | All 10 workstreams (Financial, Legal, Tax, Commercial, Operations, IT, HR, Environmental, Insurance, ESG), Quality of Earnings methodology, value creation lens / 100-day plan, change-of-control analysis, timeline expectations (7–12 months), deal-killing red flags |
| 03 | [Common Pitfalls & Failures](03-COMMON-PITFALLS-AND-FAILURES.md) | Organizational failures, deal-killing information gaps, security failures, process failures (Q&A, staging, version control), red flags PE buyers use as proxy signals, timing mistakes, technology pitfalls, real-world case studies |
| 04 | [VDR Technology & Platforms](04-VDR-TECHNOLOGY-AND-PLATFORMS.md) | Security features (IRM, fence view, watermarking), analytics & engagement scoring, Q&A management, AI/ML features, platform comparison (Intralinks, Datasite, Ansarada, Firmex, iDeals, Box, ShareFile), feature matrix, selection criteria by deal type |
| 05 | [Athelon PE Due Diligence Gap Analysis](05-ATHELON-PE-DUE-DILIGENCE-GAP-ANALYSIS.md) | Category-by-category comparison of Athelon's data model (100+ tables) against PE data room requirements. Coverage scorecard, unique value propositions, gap recommendations, and "Data Room Export" feature concept |

---

## Key Takeaways

### Structure
- 15-category numbered folder taxonomy with 2–3 levels of subfolders
- ISO 8601 dates and version tokens in every filename
- Master index with 15 metadata columns including cross-references
- Three prioritization tiers aligned to IOI → LOI → Exclusivity deal stages

### PE Diligence Priorities
- **QoE is the most economically consequential workstream** — management's adjusted EBITDA is typically 10–25% higher than what survives PE scrutiny
- **Change-of-control analysis** is the most labor-intensive legal workstream for Fortune 500 targets
- **IT diligence** has become near-equal priority to financial diligence (cybersecurity risk, tech debt quantification)
- **Fortune 500 carve-outs** add 30–40% additional complexity (captive revenue, shared services, TSA structuring)

### Common Pitfalls
- Starting data room preparation too late (need 8–12 weeks before CIM release)
- Missing or unsupported EBITDA add-backs — moves purchase price by hundreds of millions
- Scanned PDFs without OCR preventing AI-assisted review
- Data room quality treated as a direct proxy for management quality
- Q&A response delays (>48 hours) generating follow-up spirals

### Technology
- **Intralinks** — IRM market benchmark; best for cross-border, IRM-critical deals
- **Datasite** — broadest deal lifecycle suite; best for complex sell-side transactions
- **Ansarada** — AI-Predict engagement scoring (97% claimed accuracy); best for mid-market and analytics-driven processes
- **Non-negotiable features:** SOC 2 + ISO 27001, fence view, dynamic watermarking, page-level audit trail, structured Q&A, full-text search with OCR
