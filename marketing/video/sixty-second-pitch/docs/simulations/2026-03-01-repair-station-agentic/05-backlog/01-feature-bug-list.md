# Feature Bug List and Missing Features

Source: Multi-team simulation artifacts in this folder.

## A. Obvious Problems to Fix Now

| ID | Priority | Area | Problem | Evidence | Recommended Fix |
| --- | --- | --- | --- | --- | --- |
| FIX-001 | P0 | Squawks/WO | AOG triage is not surfaced as a first-class fast filter. | Alpha journey + ALPHA-01 | Add AOG quick-filter chip, default sort by operational urgency, and saved view preset. |
| FIX-002 | P0 | Scheduling | Location certainty is too subtle during active planning. | Bravo journey + BRAVO-03 | Add persistent location lock banner/watermark and reject out-of-scope drag updates with clear warning. |
| FIX-003 | P0 | Release | Release readiness requires scanning multiple panels. | Alpha journey + ALPHA-04 | Add consolidated release gate component with pass/fail reasons and direct actions. |
| FIX-004 | P1 | Compliance | Tool assignment suitability is not instantly legible. | Charlie journey + CHARLIE-03 | Add dispatch-safe badge derived from calibration, location, and status. |
| FIX-005 | P1 | Billing/Portal | Customer-visible state freshness is unclear. | Delta journey + DELTA-04 | Add sync timestamp and "last updated" indicator to portal quote/invoice views. |
| FIX-006 | P1 | Billing | Pricing/tax totals are hard to explain line-by-line. | Delta journey + DELTA-05 | Add calculation trace drawer with applied rule and tax basis per line. |
| FIX-007 | P1 | Dashboard | Leadership views are not exception-first. | Echo journey + ECHO-01 | Add "critical exceptions" mode with station-level blockers and trend deltas. |
| FIX-008 | P1 | Governance | KPI definitions are not transparent enough across pages. | Echo journey + ECHO-04 | Add metric glossary and source stamp for each executive KPI card. |
| FIX-009 | P2 | Scheduling | Graveyard restore lacks recovery context. | BRAVO-05 | Show archive actor, reason, timestamp, and prior lane metadata before restore. |
| FIX-010 | P2 | Parts | Condemn action timeline detail is shallow for audit reconstruction. | CHARLIE-04 | Add serialized component disposition timeline with mandatory reason taxonomy. |

## B. Missing Features to Add

| ID | Priority | Area | Missing Capability | Evidence | Proposal |
| --- | --- | --- | --- | --- | --- |
| FEAT-001 | P1 | Shift Ops | Shift handoff digest card with unresolved actions and owner tagging. | Alpha journey + ALPHA-02 | Generate structured shift digest from notes, blockers, and due times. |
| FEAT-002 | P1 | Scheduling | Workspace layout presets for panels and trays. | Bravo journey + BRAVO-02 | Save/restore planner workspace profiles per role and location. |
| FEAT-003 | P1 | Scheduling | Scenario bundles combining capacity and financial assumptions. | Bravo journey + BRAVO-04 | Add named what-if scenarios with apply/revert and audit trail. |
| FEAT-004 | P1 | Parts | Receiving scan/import assistant for cert-heavy intake. | Charlie journey + CHARLIE-01 | OCR/barcode-assisted cert capture + template autofill by vendor/part family. |
| FEAT-005 | P1 | Compliance | Unified fleet+aircraft compliance cockpit. | Charlie journey + CHARLIE-05 | One-page risk cockpit with drill-through and priority ranking. |
| FEAT-006 | P1 | Estimating | Semantic labor-kit search and recommendation. | Delta journey + DELTA-01 | Intent-based search with ATA and historical usage signals. |
| FEAT-007 | P1 | Billing | Dual-approval workflow for high-dollar payment posting. | Delta journey + DELTA-03 | Policy-driven approval thresholds and second-approver queue. |
| FEAT-008 | P1 | Leadership | Location staffing readiness scorecard. | Echo journey + ECHO-03 | Compute cert/shift coverage score with 7/14/30-day risk windows. |
| FEAT-009 | P2 | Parts | Risk-prioritized pending inspection queue. | Charlie journey + CHARLIE-02 | SLA/risk scoring model with override controls. |
| FEAT-010 | P2 | Quotes | Reusable manual line bundles in draft composer. | Delta journey + DELTA-02 | Save frequently used line sets and re-apply by service type. |
| FEAT-011 | P2 | Reports | Forecast variance linked to operational drivers. | Echo journey + ECHO-02 | Attach variance deltas to schedule/labor/parts contributors. |
| FEAT-012 | P2 | Governance | Throughput impact preview for location/user policy changes. | Echo journey + ECHO-05 | Run quick simulation before applying governance actions. |

## C. Implementation Sequence

1. Execute all P0 fixes in one hardening sprint.
2. Deliver P1 safety and confidence features next, grouped by handoff domain.
3. Deliver P2 acceleration features after confidence baseline is stable.

## D. Definition of Done for This Backlog

- Every item mapped to at least one journey and one observation ID.
- Every fix includes a measurable success metric.
- Every missing feature includes owner and acceptance test plan before build starts.
