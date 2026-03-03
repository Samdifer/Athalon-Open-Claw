# Industry Field Context Corpus

## Purpose and Audience
This document is the canonical index and synthesis for historical field artifacts in this folder. It is written for product and engineering teams building Athelon features for training traceability, capacity planning, scheduling, and day-to-day MRO operations.

This index has two jobs:
1. Explain what each source file is and what signal it contains.
2. Preserve a maintainable index format so future files can be added without reworking the whole document.

## Corpus Snapshot
The current corpus contains 7 source artifacts.

| File | Type / Structure | Primary Signal Area | Brief Note |
|---|---|---|---|
| `2023 leveling.pdf` | PDF, 11 pages | Scheduling + workload balancing | Monthly/annual inspection demand leveling assumptions and rough labor framing. |
| `AVEX-NS Aviation Hldgs Lean slide.pptx` | PPTX, 11 slides | Operations + process design | Lean initiative narrative with hangar layout, bay design, and standard-work progression. |
| `Elevate MRO Capacity planning.xlsx` | XLSX, 6 sheets | Capacity + forecasting model | Spreadsheet model linking assumptions, controls, workload history, and forecast outputs. |
| `Master OJT Logs AVEX BEN has ideas.xlsx` | XLSX, 4 sheets | OJT + skill progression | Roster and task-level OJT logging structure with instructor/date signoff fields. |
| `OJT Data Flow.pdf` | PDF, 6 pages | OJT data lifecycle | End-to-end physical and digital flow for individual logs and merged company-level OJT views. |
| `Repair Station Contacts with Ratings (Download).xlsx` | XLSX, 1 sheet, 5040 rows | External network data | Large contact/rating dataset for repair stations and certificate metadata. |
| `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | PDF, 41 pages | Capacity + training economics | Detailed technician utilization, billable-time, and training-burden analysis for BJC. |

## Deep Synthesis (Build-Relevant Findings)
### 1) OJT is treated as an operational control system, not just a learning checklist
Across `OJT Data Flow.pdf` and `Master OJT Logs AVEX BEN has ideas.xlsx`, the training system is modeled as a repeatable evidence trail: tasks, class records, instructor/date progression, and eventual authorization/test capture. The documents imply that OJT completion quality depends on traceable sequence and signoff integrity, not only task completion counts.

Build implication for Athelon: the product should preserve step-by-step training provenance, signer identity, and transition states between draft, reviewed, and authorized outcomes.

### 2) Capacity constraints are strongly tied to billable-hour reality and workforce readiness
`Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` frames effective capacity as a reduction from nominal staffing due to PTO, training burden, and uneven skill readiness. `Elevate MRO Capacity planning.xlsx` extends this into forecast mechanics with explicit controls and linked formulas.

Build implication for Athelon: capacity engines should model available labor as dynamic and competency-aware rather than static headcount multiplied by fixed hours.

### 3) Schedule leveling artifacts are useful, but intentionally coarse
`2023 leveling.pdf` explicitly states caveats that estimates are average-driven and should inform broader planning rather than detailed commitments. It excludes major disruption categories like heavy structural repair and similar exceptions.

Build implication for Athelon: this source is best used for initial heuristics and scenario defaults, then replaced by live operational data and uncertainty buffers.

### 4) Lean process redesign came before software formalization
`AVEX-NS Aviation Hldgs Lean slide.pptx` documents physical workflow redesign, bay structure, and task-card standardization as direct levers for cycle-time reduction. The message is that process clarity and work presentation materially change throughput and risk before any digital orchestration layer.

Build implication for Athelon: UI/UX and workflow engines should reinforce the intended work sequence and reduce technician navigation waste, not merely digitize existing disorder.

### 5) External repair-station contact data can support ecosystem features, but requires governance
`Repair Station Contacts with Ratings (Download).xlsx` is broad and operationally useful for network intelligence, partner search, and vendor-research workflows. It also appears to be raw download data that will need normalization, freshness checks, and quality validation before powering product logic.

Build implication for Athelon: treat this as seed reference data for partner modules and routing intelligence, with ingestion controls and confidence flags.

## File Index
### 1) `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`
- File: `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`
- Type/Structure: PDF, 41 pages.
- What It Is: A detailed capacity and training report focused on the BJC location (January 2023), including technician counts, billable assumptions, and productivity constraints.
- Key Signals: Technician availability loss, PTO-adjusted usable labor, self-reported billable trends, and training overhead as a productivity factor.
- How It Helps Build Athelon: Informs the labor-capacity model, forecast assumptions, and workforce-readiness dimensions for scheduling and planning modules.
- Caveats / Data Quality Notes: Historical point-in-time document; some sections rely on assumptions and self-reported data that should be calibrated against real operational telemetry.
- Suggested Follow-up: Map each input field in this report to a canonical Athelon capacity schema and mark which variables need live data refresh.

### 2) `2023 leveling.pdf`
- File: `2023 leveling.pdf`
- Type/Structure: PDF, 11 pages.
- What It Is: A schedule-leveling summary for annual inspection demand, locations, and workload balancing assumptions.
- Key Signals: Monthly demand framing, annual inspection categories, and planning assumptions that explicitly call out omitted disruption classes.
- How It Helps Build Athelon: Provides baseline logic for early demand-shaping features, backlog balancing, and month-over-month planning visualization.
- Caveats / Data Quality Notes: Document warns against detailed execution use; excludes several high-impact work types that can materially change true load.
- Suggested Follow-up: Use this as a scenario profile in planning UI and pair it with risk multipliers for excluded work classes.

### 3) `OJT Data Flow.pdf`
- File: `OJT Data Flow.pdf`
- Type/Structure: PDF, 6 pages.
- What It Is: A process map of how individual OJT binders/databases are generated, updated, and merged into company-level reporting.
- Key Signals: Hybrid physical/digital workflow, periodic merge cadence, and structured log sections for authorizations, classes, records, and resources.
- How It Helps Build Athelon: Defines target data lifecycle behavior for OJT ingestion, synchronization, and longitudinal traceability.
- Caveats / Data Quality Notes: Flow is process-centric and not fully normalized to machine-readable entities; translation to product data contracts is required.
- Suggested Follow-up: Convert this flow into explicit state transitions and ownership boundaries in Athelon workflow models.

### 4) `Elevate MRO Capacity planning.xlsx`
- File: `Elevate MRO Capacity planning.xlsx`
- Type/Structure: XLSX, 6 sheets (`2023 Forecast Totals`, `Visualization`, `Controls`, `Man Hours & Costs`, `Work History`, `TEAMGROWTH`).
- What It Is: A connected forecasting workbook linking assumptions, control variables, historical workload, labor economics, and capacity outcomes.
- Key Signals: Formula-driven scenario modeling, explicit control sheet logic, and cross-sheet dependencies between workforce and work-demand estimates.
- How It Helps Build Athelon: Offers a blueprint for model decomposition into settings, derived metrics, and presentation layers in the scheduling/capacity stack.
- Caveats / Data Quality Notes: Spreadsheet logic can hide implicit assumptions; high formula density increases risk of silent drift without validation harnesses.
- Suggested Follow-up: Extract formula families into testable backend functions and preserve sheet-level semantics as documented business rules.

### 5) `Master OJT Logs AVEX BEN has ideas.xlsx`
- File: `Master OJT Logs AVEX BEN has ideas.xlsx`
- Type/Structure: XLSX, 4 sheets (`Work Roster`, `sams training log`, `Master Task List`, `Sam Sandifer`).
- What It Is: A task-level OJT tracking workbook with roster context and repeated instructor/date progression columns leading to authorization/test outcomes.
- Key Signals: Role/roster linkage, repeated signoff checkpoints, and standardized task records with ATA/general categories.
- How It Helps Build Athelon: Informs OJT task schema design, signer events, progression scoring, and personnel-to-training linkage.
- Caveats / Data Quality Notes: Contains template/demo-like rows mixed with operational structure; needs data hygiene and controlled vocabularies.
- Suggested Follow-up: Define normalized task and signoff entities, then map spreadsheet columns to typed product fields with validation rules.

### 6) `Repair Station Contacts with Ratings (Download).xlsx`
- File: `Repair Station Contacts with Ratings (Download).xlsx`
- Type/Structure: XLSX, 1 sheet (`Sheet 1`) with 5040 rows and 29 columns.
- What It Is: A large tabular dataset of repair-station identity and contact metadata (agency name, codes, certificate, address, phone, location fields).
- Key Signals: Broad vendor/agency coverage and structured fields suitable for lookup and enrichment workflows.
- How It Helps Build Athelon: Supports potential partner-network views, location-aware routing, and external capability discovery features.
- Caveats / Data Quality Notes: Appears to be downloaded raw data; duplicates, stale records, and inconsistent formatting likely require cleanup.
- Suggested Follow-up: Build an ingestion profile with normalization, deduplication, and recency checks before any user-facing reliance.

### 7) `AVEX-NS Aviation Hldgs Lean slide.pptx`
- File: `AVEX-NS Aviation Hldgs Lean slide.pptx`
- Type/Structure: PPTX, 11 slides.
- What It Is: A lean initiative project summary describing timeline, hangar layout optimization, production bay design, and task-card standardization.
- Key Signals: Throughput gains linked to workflow design, reduced movement waste, safer bay organization, and faster inspection cycle outcomes.
- How It Helps Build Athelon: Anchors product decisions around standardized work presentation, bay-aware workflow logic, and operational clarity as a performance lever.
- Caveats / Data Quality Notes: Presentation format emphasizes narrative outcomes; supporting raw measurement detail is limited.
- Suggested Follow-up: Translate each lean intervention into measurable product instrumentation requirements (cycle time, touch time, wait states).

## Application Context Mapping
| Athelon Build Domain | Most Relevant Sources | Practical Usage in Product/Engineering |
|---|---|---|
| Training and OJT traceability | `OJT Data Flow.pdf`, `Master OJT Logs AVEX BEN has ideas.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | Define OJT task model, signer events, progression checkpoints, and training-burden effects on throughput. |
| Scheduling and workload balancing | `2023 leveling.pdf`, `Elevate MRO Capacity planning.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | Seed planning assumptions, scenario controls, and capacity-aware scheduling constraints. |
| Capacity and labor economics | `Elevate MRO Capacity planning.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | Build a dynamic capacity engine that includes utilization loss factors and skill-readiness ramp effects. |
| Operations and shop flow | `AVEX-NS Aviation Hldgs Lean slide.pptx`, `OJT Data Flow.pdf` | Design workflows and UI sequence around lean work presentation and reduced operational waste. |
| External partner intelligence | `Repair Station Contacts with Ratings (Download).xlsx` | Initialize partner/network dataset strategy with data-governance controls before production use. |

## Minimal External Context
The files in this folder are historical and operationally grounded. They align with broader repository materials, but this index intentionally keeps external linkage brief.

- Scheduling strategy in `research/scheduling/` provides modern planning patterns that can complement the historical leveling and capacity spreadsheets documented here.
- Leadership narrative and evidence synthesis in `reports/transcript-intelligence/2026-03-03/` can provide additional context for why OJT traceability and planning rigor are product priorities.

## How to Add New Reference Files
Use manual freeform updates, but keep these guardrails so entries remain comparable over time.

1. Add the new source file to this folder.
2. Update the `Corpus Snapshot` table with a new row.
3. Add one new entry under `File Index` using this recommended field shape:
   - `File`
   - `Type/Structure`
   - `What It Is`
   - `Key Signals`
   - `How It Helps Build Athelon`
   - `Caveats / Data Quality Notes`
   - `Suggested Follow-up`
4. If the source materially changes product understanding, add or revise one point in `Deep Synthesis (Build-Relevant Findings)`.
5. Update `Application Context Mapping` if the new source introduces a new domain or changes domain relevance.

Quick quality check before commit:
1. Confirm every file in this folder appears once in `Corpus Snapshot`.
2. Confirm every snapshot row has a matching `File Index` entry.
3. Confirm each `File Index` entry maps to at least one Athelon domain.
4. Keep evidence paraphrased and specific to the source file.

## Open Questions for Future Research
1. Which training progression signals are most predictive of future technician productivity and error reduction?
2. What is the minimum reliable data set needed to replace coarse schedule-leveling assumptions with live constraint-aware planning?
3. Which capacity variables should be user-configurable versus system-derived to prevent model gaming?
4. How should external repair-station data be validated and refreshed for production trust?
5. What instrumentation is needed to quantify lean workflow effects directly inside Athelon once digital workflows are deployed?
