# Master Feature Crosswalk (Derived)

Derived from `docs/spec/MASTER-BUILD-LIST.md` Registry B on 2026-03-04. Do not edit manually; regenerate via `pnpm run spec:export:derived`.

## Group Rollup

| Group ID | Group Name | Target Wave | Rollup Status | Atomic Count | Merged Source IDs |
|---|---|---|---|---:|---|
| GRP-001 | Identity and RBAC Control Plane | Wave0 | partial | 7 | MBL-069, ROLE-001, ROLE-002, ROLE-003, ROLE-004, ROLE-005, RPT-017 |
| GRP-002 | Audit, Event Ledger, and Taxonomy | Wave0 | implemented | 2 | FR-025, RPT-018 |
| GRP-003 | Work Order Core Execution | Wave1 | partial | 11 | FR-010, GAP-003, GAP-004, GAP-007, MBL-044, MBL-054, MBL-055, MBL-056, MBL-058, RPT-014, RPT-015 |
| GRP-004 | Quote Governance and Commercial Controls | Wave1 | partial | 4 | FR-023, FR-024, MBL-066, SCH-A5 |
| GRP-005 | Signoff Authority and Inspection Controls | Wave1 | partial | 3 | AUTH-001, FR-004, MBL-059 |
| GRP-006 | Parts Traceability and Receiving | Wave2 | missing | 8 | FR-006, FR-007, FR-008, FR-009, FR-019, FR-020, GAP-002, RPT-022 |
| GRP-007 | Inventory and Tooling Operations | Wave2 | missing | 4 | MBL-067, RPT-020, RPT-021, RPT-023 |
| GRP-008 | Lead Workspace and Turnover | Wave3 | missing | 6 | FR-011, FR-012, FR-013, GAP-005, MBL-021, MBL-060 |
| GRP-009 | KPI, Dashboard, and Reporting Surfaces | Wave3 | partial | 13 | CHART-001, CHART-002, CHART-003, CHART-004, CHART-005, FR-005, FR-021, FR-022, MBL-051, REPORT-001, REPORT-002, RPT-006, RPT-007 |
| GRP-010 | Fleet/WO Discoverability and UX Views | Wave4 | missing | 5 | FR-001, FR-014, FR-015, FR-017, MBL-025 |
| GRP-011 | Evidence Hub and Media Platform | Wave4 | partial | 7 | FILE-001, FILE-002, FILE-003, FILE-004, FILE-005, FILE-006, FR-016 |
| GRP-012 | Scheduling Engine and Capacity Intelligence | Wave5 | partial | 13 | FR-018, MBL-068, RPT-008, SCH-A1, SCH-A2, SCH-A3, SCHED-001, SCHED-002, SCHED-003, SCHED-004, SCHED-005, SCHED-006, SCHED-007 |
| GRP-013 | Predictive Maintenance Intelligence | Wave5 | missing | 4 | FR-002, RPT-009, RPT-010, RPT-026 |
| GRP-014 | Cross-Module Data Bus and Integrations | Wave5 | partial | 3 | MBL-064, RPT-016, SCH-A6 |
| GRP-015 | Customer Portal and Communications | Wave4 | partial | 9 | MBL-062, PORTAL-001, PORTAL-002, PORTAL-003, PORTAL-004, PORTAL-005, PORTAL-006, PORTAL-007, RPT-019 |
| GRP-016 | Training and OJT Program | Wave3 | partial | 4 | RPT-001, RPT-002, RPT-005, RPT-025 |
| GRP-017 | Regulatory and Certification Framework | Wave1 | missing | 10 | FR-003, GAP-001, GAP-006, MBL-057, MBL-061, RPT-012, RPT-013, RPT-029, SCHEMA-001, SCHEMA-002 |
| GRP-018 | Financial Planning and P&L Intelligence | Wave3 | partial | 8 | LABOR-001, LABOR-002, MBL-063, MBL-065, RPT-024, SCH-A4, TAX-001, TAX-002 |
| GRP-019 | Marketplace and Talent Matching | Wave6 | proposed | 1 | RPT-028 |
| GRP-020 | Industry Benchmarking and Quote Book | Wave6 | proposed | 1 | RPT-027 |
| GRP-021 | Reliability and Hardening Program | Wave0 | implemented | 3 | RPT-003, RPT-004, RPT-011 |
| GRP-022 | PDF/Document Export and Report Artifacts | Wave1 | proposed | 8 | EXPORT-001, EXPORT-002, PDF-001, PDF-002, PDF-003, PDF-004, PDF-005, PDF-006 |
| GRP-023 | Notifications and Alerting | Wave3 | proposed | 6 | NOTIF-001, NOTIF-002, NOTIF-003, NOTIF-004, NOTIF-005, NOTIF-006 |
| GRP-024 | UX Polish and Finishing Layer | Wave4 | proposed | 13 | POLISH-001, POLISH-002, POLISH-003, POLISH-004, POLISH-005, POLISH-006, POLISH-007, POLISH-008, POLISH-009, POLISH-010, POLISH-011, POLISH-012, POLISH-013 |

## Atomic Mapping

| MBP ID | Source Pack | Source ID | Group ID | Status | Wave | Title |
|---|---|---|---|---|---|---|
| MBP-0001 | REPORT | RPT-001 | GRP-016 | implemented | Wave3 | OJT task progression scoring |
| MBP-0002 | REPORT | RPT-002 | GRP-016 | proposed | Wave3 | Multi-aircraft shared OJT tasks |
| MBP-0003 | REPORT | RPT-003 | GRP-021 | implemented | Wave0 | Voice notes + transcript capture |
| MBP-0004 | REPORT | RPT-004 | GRP-021 | implemented | Wave0 | Spell-check accessibility layer |
| MBP-0005 | REPORT | RPT-005 | GRP-016 | partial | Wave3 | Trainer sign-off queue |
| MBP-0006 | REPORT | RPT-006 | GRP-009 | partial | Wave3 | Efficiency baseline by experience |
| MBP-0007 | REPORT | RPT-007 | GRP-009 | partial | Wave3 | Growth curve dashboard |
| MBP-0008 | REPORT | RPT-008 | GRP-012 | partial | Wave5 | Team composition warnings |
| MBP-0009 | REPORT | RPT-009 | GRP-013 | partial | Wave5 | Predictive maintenance (Chapter 5) |
| MBP-0010 | REPORT | RPT-010 | GRP-013 | partial | Wave5 | ADS-B usage integration |
| MBP-0011 | REPORT | RPT-011 | GRP-021 | implemented | Wave0 | AD/SB dynamic due logic |
| MBP-0012 | REPORT | RPT-012 | GRP-017 | partial | Wave1 | Logbook entry generation |
| MBP-0013 | REPORT | RPT-013 | GRP-017 | missing | Wave1 | Logbook scanning + OCR ingestion |
| MBP-0014 | REPORT | RPT-014 | GRP-003 | implemented | Wave1 | Work order assignment (My Work) |
| MBP-0015 | REPORT | RPT-015 | GRP-003 | implemented | Wave1 | Clock-in / labor tracking |
| MBP-0016 | REPORT | RPT-016 | GRP-014 | partial | Wave5 | Cross-module data bus |
| MBP-0017 | REPORT | RPT-017 | GRP-001 | implemented | Wave0 | Role-based access control (RBAC) |
| MBP-0018 | REPORT | RPT-018 | GRP-002 | implemented | Wave0 | Override reason logging |
| MBP-0019 | REPORT | RPT-019 | GRP-015 | partial | Wave4 | Customer portal & history |
| MBP-0020 | REPORT | RPT-020 | GRP-007 | partial | Wave2 | Inventory control + Kanban |
| MBP-0021 | REPORT | RPT-021 | GRP-007 | missing | Wave2 | Inventory master tab |
| MBP-0022 | REPORT | RPT-022 | GRP-006 | partial | Wave2 | Rotables lifecycle tracking |
| MBP-0023 | REPORT | RPT-023 | GRP-007 | partial | Wave2 | Tool calibration workflows |
| MBP-0024 | REPORT | RPT-024 | GRP-018 | partial | Wave3 | QuickBooks integration |
| MBP-0025 | REPORT | RPT-025 | GRP-016 | partial | Wave3 | Training compliance records |
| MBP-0026 | REPORT | RPT-026 | GRP-013 | partial | Wave5 | FAA profile/aircraft enrichment |
| MBP-0027 | REPORT | RPT-027 | GRP-020 | proposed | Wave6 | Market-level quote benchmark engine |
| MBP-0028 | REPORT | RPT-028 | GRP-019 | proposed | Wave6 | Talent marketplace matching |
| MBP-0029 | REPORT | RPT-029 | GRP-017 | proposed | Wave1 | Industry certification framework |
| MBP-0030 | FR | FR-001 | GRP-010 | missing | Wave4 | Multi-location UX: Map-based selection when creating a new work location. |
| MBP-0031 | FR | FR-002 | GRP-013 | missing | Wave5 | Telemetry + predictive: Ingest ADS-B movement data for tracked aircraft and estimate time/cycl |
| MBP-0032 | FR | FR-003 | GRP-017 | partial | Wave1 | WO docs + compliance: Separate compliance docs at task/subtask level from overall WO attachm |
| MBP-0033 | FR | FR-004 | GRP-005 | partial | Wave1 | Task execution + signoff: Add vendor service add flow inside task items; discrepancy + correctiv |
| MBP-0034 | FR | FR-005 | GRP-009 | partial | Wave1 | Time visibility: Show estimated task hours vs actual time logged to discrepancy/squawk. |
| MBP-0035 | FR | FR-006 | GRP-006 | partial | Wave2 | Task-level parts traceability: Add Parts Removed/Parts Installed per task with full part metadata, ro |
| MBP-0036 | FR | FR-007 | GRP-006 | partial | Wave2 | WO parts lifecycle board: In WO Parts tab, show requested/ordered/received/used-installed lifecy |
| MBP-0037 | FR | FR-008 | GRP-006 | missing | Wave2 | Parts request intake control: Part add flow should prefill from catalog; allow provisional net-new p |
| MBP-0038 | FR | FR-009 | GRP-006 | partial | Wave2 | Parts status labels: Color status semantics: requested-not-ordered (red), ordered-not-recei |
| MBP-0039 | FR | FR-010 | GRP-003 | implemented | Wave1 | WO lifecycle timeline: Show timeline stage chips/circles on every WO: Quoting, In-dock, Inspe |
| MBP-0040 | FR | FR-011 | GRP-008 | partial | Wave3 | Turnover notes + AI assist: Dated turnover notes at task level and a lead turnover workspace that |
| MBP-0041 | FR | FR-012 | GRP-008 | partial | Wave3 | Lead technician workspace: New lead page for assignment/management, team insights, and assigning |
| MBP-0042 | FR | FR-013 | GRP-008 | partial | Wave3 | Turnover report contract: Generate/save PDF turnover reports; immutable after submit; signature |
| MBP-0043 | FR | FR-014 | GRP-010 | implemented | Wave4 | Fleet filtering + view modes: Fleet filters for in-work and future schedule windows (3/6/12 months), |
| MBP-0044 | FR | FR-015 | GRP-010 | implemented | Wave4 | WO list modes + aircraft media linkage: Work Orders list supports current/tile/truncated views and aircraft th |
| MBP-0045 | FR | FR-016 | GRP-011 | partial | Wave4 | In-dock + RTS evidence hub: Add dedicated in-dock and return-to-service areas with checklist uploa |
| MBP-0046 | FR | FR-017 | GRP-010 | implemented | Wave0 | WO search by location: Search modal supports all locations or specific location filter. |
| MBP-0047 | FR | FR-018 | GRP-012 | partial | Wave5 | WO Gantt + smart assignment: Add Gantt view with dependencies, phase-tag population, lead assignmen |
| MBP-0048 | FR | FR-019 | GRP-006 | missing | Wave2 | Part return-to-parts workflow: From task/subtask, technician can return part to Parts with prefilled |
| MBP-0049 | FR | FR-020 | GRP-006 | partial | Wave2 | Receiving inspection workflow: Add receiving checklists per part/PO/batch, role-gated completion by p |
| MBP-0050 | FR | FR-021 | GRP-009 | implemented | Wave3 | WO dashboard page: Add `work-orders/dashboard` with active WO KPI, WIP (estimated vs actu |
| MBP-0051 | FR | FR-022 | GRP-009 | partial | Wave1 | WO header KPI + date commitments: Per-WO KPI summary at top (WIP/estimated/applied), prominent committed |
| MBP-0052 | FR | FR-023 | GRP-004 | implemented | Wave1 | Quote decision granularity: Pre-in-dock quote must allow accept/decline per line item with categor |
| MBP-0053 | FR | FR-024 | GRP-004 | partial | Wave1 | Secondary quote + squawk identity: Post-inspection repair quote supports same accept/decline model; each |
| MBP-0054 | FR | FR-025 | GRP-002 | implemented | Wave0 | Finding origin taxonomy: Every task/squawk tagged by origin: planned, inspection-found, custome |
| MBP-0055 | WATERFALL | AUTH-001 | GRP-005 | proposed | Wave1 | `completeStep` rating-to-step authorization — validate airframe/powerplant cert |
| MBP-0056 | WATERFALL | CHART-001 | GRP-009 | proposed | Wave3 | Dashboard: WO status distribution (pie/donut chart) |
| MBP-0057 | WATERFALL | CHART-002 | GRP-009 | proposed | Wave3 | Dashboard: Revenue trend (line chart, last 12 months) |
| MBP-0058 | WATERFALL | CHART-003 | GRP-009 | proposed | Wave3 | Dashboard: TAT performance (bar chart) |
| MBP-0059 | WATERFALL | CHART-004 | GRP-009 | proposed | Wave3 | Dashboard: Technician utilization (horizontal bar) |
| MBP-0060 | WATERFALL | CHART-005 | GRP-009 | proposed | Wave3 | Billing analytics: enhanced with real charts |
| MBP-0061 | WATERFALL | EXPORT-001 | GRP-022 | proposed | Wave1 | CSV export on all list pages (invoices, WOs, parts, fleet) |
| MBP-0062 | WATERFALL | EXPORT-002 | GRP-022 | proposed | Wave1 | Date range filter on exports |
| MBP-0063 | WATERFALL | FILE-001 | GRP-011 | proposed | Wave4 | Convex file storage integration (generateUploadUrl → store → getUrl) |
| MBP-0064 | WATERFALL | FILE-002 | GRP-011 | proposed | Wave4 | Reusable FileUpload component (drag-drop, click, preview) |
| MBP-0065 | WATERFALL | FILE-003 | GRP-011 | proposed | Wave4 | Photo upload on step sign-off (replace text URL field with actual upload) |
| MBP-0066 | WATERFALL | FILE-004 | GRP-011 | proposed | Wave4 | Photo upload on discrepancy creation |
| MBP-0067 | WATERFALL | FILE-005 | GRP-011 | proposed | Wave4 | Document attachment on work orders (actual files, not just metadata) |
| MBP-0068 | WATERFALL | FILE-006 | GRP-011 | proposed | Wave4 | Photo gallery component (thumbnail grid, lightbox view) |
| MBP-0069 | WATERFALL | LABOR-001 | GRP-018 | proposed | Wave3 | Labor rate auto-application — pricing rules exist but `unitPrice` always defaults to 0 |
| MBP-0070 | WATERFALL | LABOR-002 | GRP-018 | proposed | Wave3 | Wire `pricingProfiles` into invoice/quote line item creation |
| MBP-0071 | WATERFALL | NOTIF-001 | GRP-023 | proposed | Wave3 | `notifications` table in schema (type, message, recipientId, read, createdAt) |
| MBP-0072 | WATERFALL | NOTIF-002 | GRP-023 | proposed | Wave3 | Bell icon in TopBar with unread count badge |
| MBP-0073 | WATERFALL | NOTIF-003 | GRP-023 | proposed | Wave3 | Notification dropdown panel |
| MBP-0074 | WATERFALL | NOTIF-004 | GRP-023 | proposed | Wave3 | Auto-generate notifications: WO status change, quote approved, invoice overdue, discrep... |
| MBP-0075 | WATERFALL | NOTIF-005 | GRP-023 | proposed | Wave3 | Mark as read / mark all read |
| MBP-0076 | WATERFALL | NOTIF-006 | GRP-023 | proposed | Wave3 | Notification preferences page |
| MBP-0077 | WATERFALL | PDF-001 | GRP-022 | proposed | Wave1 | Invoice PDF template (header, line items, totals, tax, payment terms) |
| MBP-0078 | WATERFALL | PDF-002 | GRP-022 | proposed | Wave1 | Quote PDF template (header, departments/sections, line items, terms) |
| MBP-0079 | WATERFALL | PDF-003 | GRP-022 | proposed | Wave1 | RTS document PDF (aircraft info, completed work, compliance items, signatures) |
| MBP-0080 | WATERFALL | PDF-004 | GRP-022 | proposed | Wave1 | Work order summary PDF (header, task cards, discrepancies, parts used) |
| MBP-0081 | WATERFALL | PDF-005 | GRP-022 | proposed | Wave1 | "Download PDF" button on invoice detail, quote detail, RTS, WO detail pages |
| MBP-0082 | WATERFALL | PDF-006 | GRP-022 | proposed | Wave1 | "Print" button using browser print with print-friendly CSS |
| MBP-0083 | WATERFALL | POLISH-001 | GRP-024 | proposed | Wave4 | Dark mode toggle in TopBar |
| MBP-0084 | WATERFALL | POLISH-002 | GRP-024 | proposed | Wave4 | Cmd-K command palette (search, navigate, quick actions) |
| MBP-0085 | WATERFALL | POLISH-003 | GRP-024 | proposed | Wave4 | Activity timeline on work orders |
| MBP-0086 | WATERFALL | POLISH-004 | GRP-024 | proposed | Wave4 | Keyboard shortcuts (N for new, E for edit, etc.) |
| MBP-0087 | WATERFALL | POLISH-005 | GRP-024 | proposed | Wave4 | PWA manifest + service worker + offline support |
| MBP-0088 | WATERFALL | POLISH-006 | GRP-024 | proposed | Wave4 | Bulk CSV import (aircraft, parts, customers) |
| MBP-0089 | WATERFALL | POLISH-007 | GRP-024 | proposed | Wave4 | Parts reorder alerts (min-stock threshold) |
| MBP-0090 | WATERFALL | POLISH-008 | GRP-024 | proposed | Wave4 | MEL deferral tracking with countdown timers |
| MBP-0091 | WATERFALL | POLISH-009 | GRP-024 | proposed | Wave4 | Shift handoff dashboard |
| MBP-0092 | WATERFALL | POLISH-010 | GRP-024 | proposed | Wave4 | Fleet calendar (upcoming inspections) |
| MBP-0093 | WATERFALL | POLISH-011 | GRP-024 | proposed | Wave4 | Expand E2E test coverage to all features |
| MBP-0094 | WATERFALL | POLISH-012 | GRP-024 | proposed | Wave4 | Performance audit (bundle size, lazy loading) |
| MBP-0095 | WATERFALL | POLISH-013 | GRP-024 | proposed | Wave4 | WCAG AA deep pass |
| MBP-0096 | WATERFALL | PORTAL-001 | GRP-015 | proposed | Wave4 | Customer login (separate Clerk org or magic link) |
| MBP-0097 | WATERFALL | PORTAL-002 | GRP-015 | proposed | Wave4 | Customer dashboard: active WOs, recent invoices, fleet status |
| MBP-0098 | WATERFALL | PORTAL-003 | GRP-015 | proposed | Wave4 | WO status tracking (timeline view) |
| MBP-0099 | WATERFALL | PORTAL-004 | GRP-015 | proposed | Wave4 | Quote review & approve/decline inline |
| MBP-0100 | WATERFALL | PORTAL-005 | GRP-015 | proposed | Wave4 | Invoice view & payment status |
| MBP-0101 | WATERFALL | PORTAL-006 | GRP-015 | proposed | Wave4 | Download PDFs (invoices, quotes, RTS) |
| MBP-0102 | WATERFALL | PORTAL-007 | GRP-015 | proposed | Wave4 | Message/request submission to shop |
| MBP-0103 | WATERFALL | REPORT-001 | GRP-009 | proposed | Wave3 | Monthly revenue report page |
| MBP-0104 | WATERFALL | REPORT-002 | GRP-009 | proposed | Wave3 | WO throughput report |
| MBP-0105 | WATERFALL | ROLE-001 | GRP-001 | implemented | Wave0 | Define MRO roles: admin, shop_manager, qcm_inspector, lead_technician, technician, bill... |
| MBP-0106 | WATERFALL | ROLE-002 | GRP-001 | implemented | Wave0 | Admin settings page: invite user, assign role, deactivate |
| MBP-0107 | WATERFALL | ROLE-003 | GRP-001 | implemented | Wave0 | Role-based sidebar nav (hide billing from technicians, hide WO execution from billing) |
| MBP-0108 | WATERFALL | ROLE-004 | GRP-001 | implemented | Wave0 | Role-based route guards (redirect unauthorized) |
| MBP-0109 | WATERFALL | ROLE-005 | GRP-001 | implemented | Wave0 | Role display in personnel page |
| MBP-0110 | WATERFALL | SCHED-001 | GRP-012 | proposed | Wave5 | Interactive Gantt chart with drag-drop (resize, move WO bars) |
| MBP-0111 | WATERFALL | SCHED-002 | GRP-012 | proposed | Wave5 | Technician skill matching in drag-drop (warn if unqualified) |
| MBP-0112 | WATERFALL | SCHED-003 | GRP-012 | proposed | Wave5 | Hangar bay allocation view (which aircraft in which bay) |
| MBP-0113 | WATERFALL | SCHED-004 | GRP-012 | proposed | Wave5 | Bay conflict detection (double-booking warning) |
| MBP-0114 | WATERFALL | SCHED-005 | GRP-012 | proposed | Wave5 | Auto-schedule algorithm (assign WOs to bays + techs based on constraints) |
| MBP-0115 | WATERFALL | SCHED-006 | GRP-012 | proposed | Wave5 | TAT estimation based on historical data |
| MBP-0116 | WATERFALL | SCHED-007 | GRP-012 | proposed | Wave5 | Schedule snapshot/baseline comparison |
| MBP-0117 | WATERFALL | SCHEMA-001 | GRP-017 | proposed | Wave1 | Create `conformityInspections` table with proper indexes |
| MBP-0118 | WATERFALL | SCHEMA-002 | GRP-017 | proposed | Wave1 | Add conformity inspection mutations (create, complete, list) |
| MBP-0119 | WATERFALL | TAX-001 | GRP-018 | proposed | Wave3 | Invoice tax calculation — tax arg is accepted but ignored, always writes `tax: 0` |
| MBP-0120 | WATERFALL | TAX-002 | GRP-018 | proposed | Wave3 | `computeTaxForInvoice` in billingV4 — wire it into invoice creation flow |
| MBP-0121 | TECH_MVP | GAP-001 | GRP-017 | partial | Wave1 | Approved data ref on task step |
| MBP-0122 | TECH_MVP | GAP-002 | GRP-006 | partial | Wave2 | Parts installation in step sign-off |
| MBP-0123 | TECH_MVP | GAP-003 | GRP-003 | implemented | Wave1 | "My Work" tech view |
| MBP-0124 | TECH_MVP | GAP-004 | GRP-003 | partial | Wave1 | Raise Finding from task card |
| MBP-0125 | TECH_MVP | GAP-005 | GRP-008 | missing | Wave3 | Shift handoff notes on task cards |
| MBP-0126 | TECH_MVP | GAP-006 | GRP-017 | partial | Wave1 | Aircraft maintenance logbook view |
| MBP-0127 | TECH_MVP | GAP-007 | GRP-003 | implemented | Wave1 | Tech notes on step sign-off |
| MBP-0128 | SCHED | SCH-A1 | GRP-012 | proposed | Wave5 | Gantt Engine (Pure TypeScript) |
| MBP-0129 | SCHED | SCH-A2 | GRP-012 | proposed | Wave5 | Gantt UI — Interactive Visual Scheduler |
| MBP-0130 | SCHED | SCH-A3 | GRP-012 | proposed | Wave5 | Capacity Management Dashboard |
| MBP-0131 | SCHED | SCH-A4 | GRP-018 | proposed | Wave3 | P&L Projection & Financial Dashboard |
| MBP-0132 | SCHED | SCH-A5 | GRP-004 | proposed | Wave1 | Quote Builder & WO Cost Estimation |
| MBP-0133 | SCHED | SCH-A6 | GRP-014 | proposed | Wave4 | Routes, Navigation & Integration |
| MBP-0134 | MASTER | MBL-021 | GRP-008 | partial | Wave3 | Overtime / Shift Management |
| MBP-0135 | MASTER | MBL-025 | GRP-010 | partial | Wave4 | Search — Global Search |
| MBP-0136 | MASTER | MBL-044 | GRP-003 | partial | Wave1 | Work Order Routing Templates + Standard Minutes |
| MBP-0137 | MASTER | MBL-051 | GRP-009 | partial | Wave3 | Operational Report Builder + Scheduled Report Runs |
| MBP-0138 | MASTER | MBL-054 | GRP-003 | partial | Wave1 | Task-card compliance persistence guard |
| MBP-0139 | MASTER | MBL-055 | GRP-003 | partial | Wave1 | Lead-tech execution safety orchestration |
| MBP-0140 | MASTER | MBL-056 | GRP-003 | partial | Wave1 | Task-card authoring validation hardening |
| MBP-0141 | MASTER | MBL-057 | GRP-017 | partial | Wave2 | Discrepancy raise/link integrity controls |
| MBP-0142 | MASTER | MBL-058 | GRP-003 | partial | Wave1 | My Work assignment consistency checks |
| MBP-0143 | MASTER | MBL-059 | GRP-005 | partial | Wave1 | Sign-off dialog integrity guardrails |
| MBP-0144 | MASTER | MBL-060 | GRP-008 | partial | Wave2 | Squawk escalation and handoff safety |
| MBP-0145 | MASTER | MBL-061 | GRP-017 | partial | Wave1 | Certificate normalization and hygiene |
| MBP-0146 | MASTER | MBL-062 | GRP-015 | partial | Wave2 | Customer account CRM and profile ledger |
| MBP-0147 | MASTER | MBL-063 | GRP-018 | partial | Wave2 | AR/deposits/credit memo control pack |
| MBP-0148 | MASTER | MBL-064 | GRP-014 | partial | Wave2 | Procurement and vendor operations pack |
| MBP-0149 | MASTER | MBL-065 | GRP-018 | partial | Wave3 | Recurring billing contract engine |
| MBP-0150 | MASTER | MBL-066 | GRP-004 | partial | Wave2 | Labor-kit and quote-template library |
| MBP-0151 | MASTER | MBL-067 | GRP-007 | partial | Wave2 | Parts logistics operations pack |
| MBP-0152 | MASTER | MBL-068 | GRP-012 | partial | Wave4 | Roster and crew coordination controls |
| MBP-0153 | MASTER | MBL-069 | GRP-001 | partial | Wave2 | Station config and org governance console |

