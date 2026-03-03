# Industry Field Context Corpus

## Purpose and Audience
This document is the navigation hub for the research/industry-context-field-artifacts corpus. It is intended for product, engineering, and planning workflows that need field-grounded context while updating feature specs and implementation priorities.

## Corpus Snapshot (2026-03-03)
- Legacy corpus baseline (before split-index docs): 1,408 files
- New split-index docs added under `context-index/`: 5 files
- Current total files in folder: 1,413

| Corpus Slice | Files | Primary Signal |
|---|---:|---|
| Root-level artifacts | 10 | Capacity models, OJT flows, manuals, contact/rating datasets |
| `Avex Training` | 15 | Training documents, signoff patterns, practical maintenance guides |
| `Sky Source Source Files` | 132 | CFR/AC/Order-8900/DCT regulatory references + internal cross-indexes |
| `Skysource report` | 21 | Audit findings and interpreted compliance narratives |
| `Mayo Aviation historical quotes and pricing data` | 719 | Labor-rate history, flat-rate libraries, quote/proposal archives, retrofit evidence |
| `Sam Perez Scans` | 108 | Scanned field paperwork and operational receipt/log evidence |
| `drive-download-20260303T210334Z-3-001` | 401 | Legacy operational screenshots corpus (+ sidecars) |
| `drive-download-20260303T210546Z-3-001` | 2 | Additional scan PDFs |

## Context Index Navigation
Use the split index documents for exhaustive high-signal listings and focused feature relevance.

| Index Doc | Focus | Typical Feature Use |
|---|---|---|
| [01-avex-elevate-training-capacity.md](./context-index/01-avex-elevate-training-capacity.md) | AVEX/Elevate OJT, training, capacity, compliance manuals | 16, 20, 21, 26, 51 |
| [02-skysource-regulatory-audit.md](./context-index/02-skysource-regulatory-audit.md) | CFR/AC/Order 8900 source packs + DCT and audit findings | 20, 30, 41 |
| [03-mayo-quote-pricing-retrofit.md](./context-index/03-mayo-quote-pricing-retrofit.md) | Historical quotes, labor-rate/flat-rate history, retrofit workups | 44, 51, 52 |
| [04-field-scans-and-image-corpus.md](./context-index/04-field-scans-and-image-corpus.md) | Scan-heavy and screenshot-heavy archive summary | 12, 44, 52 |
| [05-photo-full-review-ledger.md](./context-index/05-photo-full-review-ledger.md) | Full visual ledger for all reviewed real images | 12, 44, 52 |

## File Index
### Canonical Root Artifacts
- `2023 leveling.pdf`
- `AVEX-NS Aviation Hldgs Lean slide.pptx`
- `Elevate MRO Capacity planning.xlsx`
- `Elevate MRO QCM CRS# K4LR032E.pdf`
- `Elevate MRO RSM CRS# K4LR032E.pdf`
- `Master OJT Logs AVEX BEN has ideas.xlsx`
- `OJT Data Flow.pdf`
- `Repair Station Contacts with Ratings (Download).xlsx`
- `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`

### Exhaustive/High-Signal Sub-Indexes
- [AVEX + Elevate Training/Capacity](./context-index/01-avex-elevate-training-capacity.md)
- [SkySource Regulatory + Audit](./context-index/02-skysource-regulatory-audit.md)
- [Mayo Quote/Pricing/Retrofit](./context-index/03-mayo-quote-pricing-retrofit.md)
- [Field Scans + Image Corpus](./context-index/04-field-scans-and-image-corpus.md)
- [Photo Full-Review Ledger](./context-index/05-photo-full-review-ledger.md)

### Regulatory Sub-Index Entry Points
- [Master Regulatory Index](./Sky%20Source%20Source%20Files/Indexes/master-index.json)
- [Cross References](./Sky%20Source%20Source%20Files/Indexes/cross-references.md)
- [CFR Part 145](./Sky%20Source%20Source%20Files/Indexes/cfr/part-145.md)
- [Advisory Circular Index](./Sky%20Source%20Source%20Files/Indexes/advisory-circulars/ac-index.md)
- [Order 8900 Index](./Sky%20Source%20Source%20Files/Indexes/order-8900/order-index.md)
- [DCT Items](./Sky%20Source%20Source%20Files/Indexes/order-8900/dct-items.md)
- [Repair Station Docs](./Sky%20Source%20Source%20Files/Indexes/repair-station/rs-docs-index.md)

## Photo Corpus Reviewed in Full
### Review Method
- Full-corpus visual pass was completed for both photo-heavy folders by rendering and viewing all real images.
- AppleDouble sidecars (`._*.png`) were counted but excluded from semantic interpretation.

### Coverage Totals
- `drive-download-20260303T210334Z-3-001`: 400 PNG files total, 135 AppleDouble sidecars, 265 real screenshots semantically reviewed
- `Mayo Aviation historical quotes and pricing data`: 117 real images semantically reviewed
- Full ledger: [05-photo-full-review-ledger.md](./context-index/05-photo-full-review-ledger.md)

## Deep Synthesis (Build-Relevant Findings)
1. Regulatory authority and audit evidence is now broad enough to support deterministic compliance-surface features (CFR/AC/Order/DCT linkage).
2. Historical quote/pricing archives provide strong context for estimation standardization and recurring report outputs.
3. Legacy screenshot telemetry captures real operational workflow states that can anchor dashboard/report and workflow parity decisions.
4. Retrofit image evidence adds concrete baseline context for routing templates, part-lineage flows, and photo-backed traceability.

## Application Context Mapping
| Athelon Build Domain | Most Relevant Sources | Practical Usage in Product/Engineering |
|---|---|---|
| Training and OJT traceability | `OJT Data Flow.pdf`, `Master OJT Logs AVEX BEN has ideas.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`, `context-index/01-avex-elevate-training-capacity.md` | Define OJT task model, signer events, progression checkpoints, and readiness-driven qualification behaviors. |
| Scheduling and workload balancing | `2023 leveling.pdf`, `Elevate MRO Capacity planning.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | Seed planning assumptions and capacity-aware scheduling constraints. |
| Capacity and labor economics | `Elevate MRO Capacity planning.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`, `context-index/03-mayo-quote-pricing-retrofit.md` | Build utilization-aware KPI and reporting logic with historically grounded labor assumptions. |
| Operations and shop flow | `AVEX-NS Aviation Hldgs Lean slide.pptx`, `context-index/04-field-scans-and-image-corpus.md` | Shape workflow orchestration around real execution patterns and handoff states. |
| External partner intelligence | `Repair Station Contacts with Ratings (Download).xlsx` | Inform partner/location-aware search and navigation patterns. |
| Regulatory compliance authority and audit evidence | `context-index/02-skysource-regulatory-audit.md`, `Sky Source Source Files/Indexes/master-index.json`, `Skysource report/audit-EP_1_4_2-findings-report.docx` | Power compliance dashboard logic, conformity evidence models, and policy enforcement rules. |
| Historical quoting and retrofit estimation | `context-index/03-mayo-quote-pricing-retrofit.md` | Seed historical pricing and retrofit estimation context for report builder and quoting intelligence. |
| Operational screenshot telemetry (legacy workflow) | `context-index/05-photo-full-review-ledger.md`, `drive-download-20260303T210334Z-3-001/Screenshot 2025-10-31 111606.png` | Use real UI telemetry as evidence for dashboard/report parity and process reconstruction. |
| Field photo evidence for retrofit traceability | `context-index/05-photo-full-review-ledger.md`, `Mayo Aviation historical quotes and pricing data/Mayo Quotes 2016_2017/Banner Health/N98TG/Nats old quote/Garmin.png` | Link part-lineage/routing features to real retrofit photo evidence patterns and baseline states. |

## Maintenance Notes
1. Add new artifacts to the appropriate split index rather than expanding this hub into exhaustive listings.
2. Keep this root doc focused on synthesis, mapping, and navigation links.
3. When adding photo-heavy archives, update `05-photo-full-review-ledger.md` with explicit coverage totals.
