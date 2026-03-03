# Feature Intake Categorization + Wave Roadmap

Date: 2026-03-03  
Status: Draft for prioritization and sequencing  
Scope: Work Orders, Parts, Fleet, Scheduling, Turnover, Roles/RBAC, media evidence, and telemetry integrations

## 1) Purpose

Turn the disjoint feature intake into a structured backlog that can be executed by agentic teams in repeatable waves:
1. `Plan` team produces validated design packets.
2. `Build` team implements scoped slices.
3. `Test` team runs automated + role-based validation gates.

## 1.1) Execution Snapshot (2026-03-03)

Completed:
1. `FR-010` Work-order lifecycle timeline
2. `FR-017` Location-aware work-order search/filter
3. `FR-021` Work-order dashboard subpage
4. `FR-023` Quote line-item decision UX (baseline)
5. `FR-014` Fleet filters + list/tile/truncated views
6. `FR-015` Work-order list/tile/truncated views + aircraft thumbnail linkage
7. `FR-016` In-dock/RTS evidence hub baseline (checklist/video upload + preview/download)

In progress / partial:
1. `FR-024` Secondary quote actor-attribution depth
2. `FR-011`/`FR-012`/`FR-013` Lead workspace + turnover baseline implemented (assignment, draft/save, submit lock, PDF), advanced analytics and full contract details pending
3. `FR-016` Digital checklist template administration and stronger evidence retention/governance controls

## 2) Normalized Terms (for consistency)

1. `Task` maps to `taskCard`.
2. `Subtask` maps to `taskCardStep`.
3. `Squawk` maps to discrepancy/finding record.
4. `WO` maps to work order.
5. `In-doc` normalized as `in-dock`.
6. `RIII` treated as a specialized inspector privilege tier (double-inspection authority).
7. `SWAC` is retained as provided and flagged for clarification (likely squawk linkage).

## 3) Categorized Feature Register

| ID | Category | Normalized Requirement | Priority | Suggested Wave |
|---|---|---|---|---|
| FR-001 | Multi-location UX | Map-based selection when creating a new work location. | P1 | Wave 4 |
| FR-002 | Telemetry + predictive | Ingest ADS-B movement data for tracked aircraft and estimate time/cycles from last known baseline to shift scheduling and predictive maintenance. | P1 | Wave 5 |
| FR-003 | WO docs + compliance | Separate compliance docs at task/subtask level from overall WO attachments; add task/subtask manual references (PDF/link/file), in-app PDF viewer, and download. | P0 | Wave 1 |
| FR-004 | Task execution + signoff | Add vendor service add flow inside task items; discrepancy + corrective action fields with immutable history; enforce technician signoff and independent inspector/RIII signoff via privileges and training compliance gates; add admin role capability matrix. | P0 | Wave 1 |
| FR-005 | Time visibility | Show estimated task hours vs actual time logged to discrepancy/squawk. | P1 | Wave 1 |
| FR-006 | Task-level parts traceability | Add Parts Removed/Parts Installed per task with full part metadata, rotable/consumable support, compliance docs access, and lot-level chain of custody history. | P0 | Wave 2 |
| FR-007 | WO parts lifecycle board | In WO Parts tab, show requested/ordered/received/used-installed lifecycle and link each part to associated SWAC/squawk. | P1 | Wave 2 |
| FR-008 | Parts request intake control | Part add flow should prefill from catalog; allow provisional net-new part requests routed to parts clerk acceptance/edit queue before permanent catalog entry. | P0 | Wave 2 |
| FR-009 | Parts status labels | Color status semantics: requested-not-ordered (red), ordered-not-received (yellow), received-not-installed (purple), installed (green), returned-to-stock (orange). | P1 | Wave 2 |
| FR-010 | WO lifecycle timeline | Show timeline stage chips/circles on every WO: Quoting, In-dock, Inspection, Repair, Return to Service, Review & Improvement. | P1 | Wave 1 |
| FR-011 | Turnover notes + AI assist | Dated turnover notes at task level and a lead turnover workspace that aggregates in-work WOs from clocked activity/recents, with AI draft summary editable by lead and preserved in history. | P1 | Wave 3 |
| FR-012 | Lead technician workspace | New lead page for assignment/management, team insights, and assigning WOs/tasks/subtasks to teams/individuals with bidirectional status reporting into lead and turnover views. | P0 | Wave 3 |
| FR-013 | Turnover report contract | Generate/save PDF turnover reports; immutable after submit; signature and audit trail; include time totals, per-person/team breakdowns, graphs, deadlines, parts ordered/received, and lead notes. | P1 | Wave 3 |
| FR-014 | Fleet filtering + view modes | Fleet filters for in-work and future schedule windows (3/6/12 months), plus list/tile/truncated modes and classification by class/type/make/model. | P1 | Wave 4 |
| FR-015 | WO list modes + aircraft media linkage | Work Orders list supports current/tile/truncated views and aircraft thumbnails linked to Fleet featured image + gallery/carousel. | P1 | Wave 4 |
| FR-016 | In-dock + RTS evidence hub | Add dedicated in-dock and return-to-service areas with checklist uploads, digital checklist templates, incoming inspection and RTS liability video upload/view/download, mobile-friendly (10-20 min videos, multiple files, auto naming). | P0 | Wave 4 |
| FR-017 | WO search by location | Search modal supports all locations or specific location filter. | P1 | Wave 0 |
| FR-018 | WO Gantt + smart assignment | Add Gantt view with dependencies, phase-tag population, lead assignment controls, and foundation for automated assignment based on actuals/performance (PMBOK-aligned). | P1 | Wave 5 |
| FR-019 | Part return-to-parts workflow | From task/subtask, technician can return part to Parts with prefilled return info; parts dept confirms receipt and re-stocks only after receiving inspection. | P1 | Wave 2 |
| FR-020 | Receiving inspection workflow | Add receiving checklists per part/PO/batch, role-gated completion by parts clerk capability, digital ownership trail, conformity doc uploads (8130/EASA/etc), mobile photo capture, batch PDF download. | P0 | Wave 2 |
| FR-021 | WO dashboard page | Add `work-orders/dashboard` with active WO KPI, WIP (estimated vs actual hours), and countdown to RTS date. | P1 | Wave 3 |
| FR-022 | WO header KPI + date commitments | Per-WO KPI summary at top (WIP/estimated/applied), prominent committed RTS date, and controlled post-inspection out-date update flow. | P0 | Wave 1 |
| FR-023 | Quote decision granularity | Pre-in-dock quote must allow accept/decline per line item with categories: airworthiness, recommended, customer-info-only. | P0 | Wave 1 |
| FR-024 | Secondary quote + squawk identity | Post-inspection repair quote supports same accept/decline model; each squawk has stable unique ID, with actor/time decision history visible. | P0 | Wave 1 |
| FR-025 | Finding origin taxonomy | Every task/squawk tagged by origin: planned, inspection-found, customer-reported, RTS-found, post-release-found. | P1 | Wave 0 |

## 4) Epic Grouping

1. `EPIC-A: Governance, Roles, and Auditability`
Scope: FR-004, FR-012, FR-013, FR-020, FR-025.

2. `EPIC-B: Work Order Execution and Commercial Control`
Scope: FR-003, FR-004, FR-005, FR-010, FR-022, FR-023, FR-024.

3. `EPIC-C: Parts Lifecycle and Traceability`
Scope: FR-006, FR-007, FR-008, FR-009, FR-019, FR-020.

4. `EPIC-D: Lead Operations and Turnover Intelligence`
Scope: FR-011, FR-012, FR-013, FR-021.

5. `EPIC-E: Fleet/WO Discoverability and Evidence Media`
Scope: FR-001, FR-014, FR-015, FR-016, FR-017.

6. `EPIC-F: Planning Intelligence and External Telemetry`
Scope: FR-002, FR-018.

## 5) Dependency Gates

1. `GATE-1 (Identity + Privileges)`: Role capability matrix and privilege checks must be in place before signoff, receiving inspection ownership, and immutable turnover submission.
2. `GATE-2 (Audit/Event Ledger)`: Actor-attributed change history required before discrepancy/corrective action, quote decisions, and checklist signoff can go live.
3. `GATE-3 (Document/Media Platform)`: Unified attachment service (PDF + video metadata, viewer, download, retention policy) required before in-dock/RTS evidence and manual excerpts.
4. `GATE-4 (Taxonomy Contracts)`: Shared enums for lifecycle phase, finding origin, and parts status labels before dashboard/Gantt/filters.
5. `GATE-5 (Time/WIP Data Reliability)`: Task-level estimated/actual rollups must be correct before WO dashboard and lead turnover analytics.

## 6) Multi-Wave Execution Plan

## Wave 0: Control Plane Foundation
Objective: establish non-negotiable foundations used by all later waves.  
Scope: FR-017, FR-025, and foundational slices from FR-004 (role capability framework).  
Deliverables:
1. Centralized permission capability map in admin settings.
2. Shared finding-origin taxonomy model and migration strategy.
3. Work-order search location filter (all vs specific).
4. Audit event schema extensions for actor-attributed updates.

Exit Gate:
1. RBAC negative tests pass for technician/inspector/parts_clerk/read_only.
2. Audit trail entries are generated for protected mutations.

## Wave 1: Work Order Compliance + Quote Governance
Objective: make work execution and quote decisions audit-safe and operationally complete.  
Scope: FR-003, FR-004, FR-005, FR-010, FR-022, FR-023, FR-024.  
Deliverables:
1. Task/subtask compliance document model and manual reference viewer/download.
2. Discrepancy/corrective action workflow with edit history and dual-signoff policy.
3. WO timeline header and per-WO KPI commitment block.
4. Line-item accept/decline lifecycle for initial and secondary quotes.

Exit Gate:
1. Signature authority and independent inspection constraints enforced.
2. Quote decision history is immutable and actor-attributed.
3. Task estimated vs actual time reconciles with time clock data.

## Wave 2: Parts Closed-Loop Lifecycle
Objective: complete request-to-install-to-return traceability with receiving controls.  
Scope: FR-006, FR-007, FR-008, FR-009, FR-019, FR-020.  
Deliverables:
1. Task-level parts removed/installed ledgers with lot/chain-of-custody docs.
2. WO parts lifecycle board with SWAC/squawk linkage.
3. Provisional part intake queue for parts clerk acceptance/edit.
4. Color-coded status semantics standardized across WO and Parts pages.
5. Return-to-parts workflow and receiving reinspection gate.
6. Receiving checklist, role-gated acceptance, conformity doc/media bundle export.

Exit Gate:
1. No part can move to issuable inventory without receiving completion.
2. Every install/remove/return action is actor-attributed and reversible only by explicit workflow.

## Wave 3: Lead Operations + Turnover Reporting
Objective: enable lead-level assignment control and immutable turnover reporting.  
Scope: FR-011, FR-012, FR-013, FR-021.  
Deliverables:
1. Lead dashboard with assignment controls for WO/task/subtask to teams/individuals.
2. My Tasks sync and completion feedback loops.
3. Turnover workspace aggregating day activity and AI-assisted draft summary.
4. Turnover report generation (editable draft, signed submit, immutable final, PDF).
5. Work Order Dashboard page for active WIP and days-to-RTS tracking.

Exit Gate:
1. Submitted turnover reports cannot be edited.
2. Time totals and assignment outputs reconcile against source records.

## Wave 4: Fleet + Work Order UX + Evidence Media
Objective: improve discoverability and add in-dock/RTS visual evidence workflows.  
Scope: FR-001, FR-014, FR-015, FR-016.  
Deliverables:
1. Fleet filters (in work, 3/6/12 month schedule windows) + view modes + aircraft class filters.
2. Work Orders list view modes and aircraft thumbnail linkage from Fleet gallery.
3. In-dock and RTS checklist hubs with upload/view/download for liability videos.
4. Mobile-first large video upload flow with auto file naming.

Exit Gate:
1. Video ingest supports target file durations and multiple uploads without UI timeout failures.
2. Media records are retained with aircraft/work-order context and download access.

## Wave 5: Planning Intelligence + Telemetry
Objective: add advanced planning engine and external aircraft telemetry integration.  
Scope: FR-002, FR-018.  
Deliverables:
1. WO Gantt by phase tags with dependency editing and lead assignment controls.
2. Auto-assignment recommendation engine using progress/performance actuals.
3. ADS-B ingest pipeline with baseline reconciliation for estimated hours/cycles deltas.
4. Predictive scheduling impact signals driven by telemetry-estimated utilization.

Exit Gate:
1. Telemetry source reliability and provenance logging in place.
2. Gantt dependencies enforce valid scheduling constraints.

## 7) Agentic Team Model per Wave

For each wave, run three coordinated teams with strict handoff contracts:

1. `Plan Team`
Outputs:
1. Design doc with domain model changes, UI flows, acceptance criteria, RBAC matrix, migration plan.
2. Risk register (regulatory + operational + data integrity).
3. Test charter and seeded data requirements.

2. `Build Team`
Outputs:
1. Backend mutations/queries and schema migration patches.
2. UI surfaces and interaction states.
3. Audit logging and feature flags.

3. `Test Team`
Outputs:
1. E2E suites per wave (`happy`, `edge`, `permission`, `audit`).
2. Role-run validation script (technician, lead_technician, qcm_inspector, parts_clerk, admin, read_only).
3. Exit report with unresolved defects and go/no-go recommendation.

## 8) Initial Question Queue (Run Sequentially)

These are the highest-impact clarifications to lock before Wave 0/1 design freeze:

1. Confirm `SWAC` meaning and target entity link (squawk/discrepancy or separate construct).
2. Confirm whether RIII is a separate role or a capability attached to inspector roles.
3. Define required training-compliance rules that gate signoff eligibility.
4. Define evidence retention policy for in-dock/RTS videos (duration, storage class, deletion policy).
5. Confirm maximum upload size and accepted video formats for mobile capture.
6. Confirm quote acceptance actor(s): customer portal user, internal user, or both.
7. Confirm if provisional parts can be used before clerk acceptance (recommended: no).
8. Confirm authority required to change committed RTS date post-inspection.
9. Confirm whether AI-generated turnover summary must store original prompt/output for audit.
10. Confirm approved ADS-B data source(s), licensing, and update cadence.

## 9) Recommended Immediate Next Step

Start Wave 0 planning packet first, then Wave 1 packet immediately after, because Waves 2-5 depend on RBAC/audit/taxonomy foundations from those two packets.
