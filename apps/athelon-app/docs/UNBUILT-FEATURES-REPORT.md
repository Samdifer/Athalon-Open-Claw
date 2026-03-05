# Athelon MRO — Unbuilt Features Report

**Generated:** 2026-03-05 13:30 UTC  
**Source:** `docs/spec/MASTER-BUILD-LIST.md` (Registry A: 69 features, Registry B: 153 atomic items)

---

## Summary

| Status | Count |
|--------|-------|
| **Not Implemented** | 78 |
| **Partially Implemented** | 53 |
| **Backend Needed** | 2 feature groups (FS-0012, FS-0052) |
| **Fully Implemented** | ~22 |
| **Total Spec'd** | 153 |

---

## P0 — Must Have (Not Implemented)

These are specified as critical but have **zero implementation**.

| MBP | Title | Wave | Notes |
|-----|-------|------|-------|
| MBP-0013 | Logbook scanning + OCR ingestion | Wave1 | Needs OCR pipeline — "no good answers" per transcript |
| MBP-0021 | Inventory master tab — complete searchable inventory | Wave2 | Route exists but page is stub |
| MBP-0037 | Parts request intake control — prefill from catalog, provisional net-new parts | Wave2 | No parts clerk acceptance queue |
| MBP-0055 | `completeStep` rating-to-step authorization — validate A&P cert | Wave1 | Backend enforcement missing |
| MBP-0117 | Create `conformityInspections` table with indexes | — | Schema not added |
| MBP-0118 | Conformity inspection mutations (create, complete, list) | — | No backend |

## P0 — Must Have (Partially Implemented)

Started but not complete — high priority gaps.

| MBP | Title | Wave | What's Missing |
|-----|-------|------|----------------|
| MBP-0032 | WO docs + compliance at task/subtask level | Wave1 | PDF viewer, task-level manual references |
| MBP-0033 | Task execution + signoff with vendor service flow | Wave1 | Inspector/RIII signoff gates, admin capability matrix |
| MBP-0035 | Task-level parts traceability (removed/installed) | Wave2 | Full part metadata, lot-level chain of custody |
| MBP-0041 | Lead technician workspace — assignment & team insights | Wave3 | Bidirectional status, task/subtask assignment to individuals |
| MBP-0045 | In-dock + RTS evidence hub — checklists, video upload | Wave4 | Digital checklist templates, video upload (10-20 min), auto-naming |
| MBP-0049 | Receiving inspection — role-gated, conformity docs, mobile photo | Wave2 | Batch PDF download, mobile photo capture |
| MBP-0051 | WO header KPI + date commitments | Wave1 | Post-inspection out-date update flow |
| MBP-0053 | Secondary quote + squawk identity with decision history | Wave1 | Actor/time decision history visible per squawk |
| MBP-0136 | Work Order Routing Templates + Standard Minutes | — | Backend needed |

---

## P1 — High Priority (Not Implemented) — By Category

### 📊 Dashboard Charts (5 items)
| MBP | Title |
|-----|-------|
| MBP-0056 | WO status distribution (pie/donut chart) |
| MBP-0057 | Revenue trend (line chart, last 12 months) |
| MBP-0058 | TAT performance (bar chart) |
| MBP-0059 | Technician utilization (horizontal bar) |
| MBP-0060 | Billing analytics enhanced with real charts |

### 📄 PDF Generation (6 items)
| MBP | Title |
|-----|-------|
| MBP-0077 | Invoice PDF template |
| MBP-0078 | Quote PDF template |
| MBP-0079 | RTS document PDF |
| MBP-0080 | Work order summary PDF |
| MBP-0081 | "Download PDF" button on detail pages |
| MBP-0082 | "Print" button with print-friendly CSS |

### 📁 File Upload & Storage (6 items)
| MBP | Title |
|-----|-------|
| MBP-0063 | Convex file storage integration |
| MBP-0064 | Reusable FileUpload component (drag-drop, preview) |
| MBP-0065 | Photo upload on step sign-off |
| MBP-0066 | Photo upload on discrepancy creation |
| MBP-0067 | Document attachment on work orders (actual files) |
| MBP-0068 | Photo gallery (thumbnail grid, lightbox) |

### 🔔 Notifications (6 items)
| MBP | Title |
|-----|-------|
| MBP-0071 | `notifications` table in schema |
| MBP-0072 | Bell icon in TopBar with unread badge |
| MBP-0073 | Notification dropdown panel |
| MBP-0074 | Auto-notifications (WO status, quote approved, invoice overdue) |
| MBP-0075 | Mark as read / mark all read |
| MBP-0076 | Notification preferences page |

### 💰 Billing & Pricing (4 items)
| MBP | Title |
|-----|-------|
| MBP-0069 | Labor rate auto-application (unitPrice defaults to 0) |
| MBP-0070 | Wire pricingProfiles into invoice/quote creation |
| MBP-0119 | Invoice tax calculation (tax arg ignored, always 0) |
| MBP-0120 | `computeTaxForInvoice` — wire into creation flow |

### 📋 CSV Export (2 items)
| MBP | Title |
|-----|-------|
| MBP-0061 | CSV export on all list pages |
| MBP-0062 | Date range filter on exports |

### 📅 Scheduling (7 items)
| MBP | Title |
|-----|-------|
| MBP-0110 | Interactive Gantt with drag-drop |
| MBP-0111 | Technician skill matching in drag-drop |
| MBP-0112 | Hangar bay allocation view |
| MBP-0113 | Bay conflict detection |
| MBP-0114 | Auto-schedule algorithm |
| MBP-0115 | TAT estimation from historical data |
| MBP-0116 | Schedule snapshot/baseline comparison |

### 🧑‍💼 Customer Portal (7 items)
| MBP | Title |
|-----|-------|
| MBP-0096 | Customer login (Clerk org or magic link) |
| MBP-0097 | Customer dashboard (active WOs, invoices, fleet) |
| MBP-0098 | WO status tracking (timeline view) |
| MBP-0099 | Quote review & approve/decline inline |
| MBP-0100 | Invoice view & payment status |
| MBP-0101 | Download PDFs (invoices, quotes, RTS) |
| MBP-0102 | Message/request submission to shop |

### 📈 Reports (2 items)
| MBP | Title |
|-----|-------|
| MBP-0103 | Monthly revenue report page |
| MBP-0104 | WO throughput report |

### 🔧 Other P1
| MBP | Title |
|-----|-------|
| MBP-0030 | Multi-location UX — map-based location selection |
| MBP-0031 | ADS-B telemetry ingestion for predictive maintenance |
| MBP-0048 | Part return-to-parts workflow |
| MBP-0125 | Shift handoff notes on task cards |
| MBP-0128 | Gantt Engine (pure TypeScript) |
| MBP-0129 | Gantt UI — Interactive Visual Scheduler |
| MBP-0130 | Capacity Management Dashboard |
| MBP-0131 | P&L Projection & Financial Dashboard |
| MBP-0132 | Quote Builder & WO Cost Estimation |
| MBP-0133 | Routes, Navigation & Integration |

---

## P1 — High Priority (Partially Implemented)

These have scaffolding or partial UI but need completion.

| MBP | Title | What's Missing |
|-----|-------|----------------|
| MBP-0005 | Trainer sign-off queue | Notifications, explicit pending list |
| MBP-0006 | Efficiency baseline by experience | HR/profile data wiring |
| MBP-0007 | Growth curve dashboard | KPI definitions, role-based views |
| MBP-0008 | Team composition warnings | Real-time staffing risk alerts |
| MBP-0009 | Predictive maintenance (Chapter 5) | Continuous prediction engine |
| MBP-0010 | ADS-B usage integration | External feed ingestion, correction factor wiring |
| MBP-0012 | Logbook entry generation | Automated draft entries per work stage |
| MBP-0016 | Cross-module data bus | Event-driven integration |
| MBP-0019 | Customer portal & history | Full lifecycle visibility |
| MBP-0020 | Inventory control + Kanban | Consumables planning, forecasting |
| MBP-0022 | Rotables lifecycle tracking | Full install/remove/disposition lifecycle |
| MBP-0023 | Tool calibration workflows | Calibration control, due dates |
| MBP-0024 | QuickBooks integration | Bi-directional sync (needs external OAuth) |
| MBP-0025 | Training compliance records | Full requirements + completion workflows |
| MBP-0026 | FAA profile/aircraft enrichment | Verified external profile ingestion |
| MBP-0034 | Time visibility — estimated vs actual hours | Per-discrepancy/squawk breakdown |
| MBP-0036 | WO parts lifecycle board | Link parts to SWAC/squawk |
| MBP-0038 | Parts status color labels | Full 5-color semantic system |
| MBP-0040 | Turnover notes + AI assist | AI draft summary, history preservation |
| MBP-0042 | Turnover report PDF | Immutable after submit, signatures, graphs |
| MBP-0047 | WO Gantt + smart assignment | Dependencies, automated assignment |
| MBP-0121 | Approved data ref on task step | Partial — needs completion |
| MBP-0124 | Raise Finding from task card | Partial — needs completion |
| MBP-0138–0153 | 16 integrity/safety controls | Various workflow hardening items |

---

## P2 — Nice to Have (Not Implemented)

| MBP | Title |
|-----|-------|
| MBP-0002 | Multi-aircraft shared OJT tasks |
| MBP-0027 | Market-level quote benchmark engine |
| MBP-0028 | Talent marketplace matching |
| MBP-0029 | Industry certification framework |
| MBP-0083 | Dark mode toggle in TopBar |
| MBP-0084 | Cmd-K command palette |
| MBP-0085 | Activity timeline on work orders |
| MBP-0086 | Keyboard shortcuts (N, E, etc.) |
| MBP-0087 | PWA manifest + service worker + offline |
| MBP-0088 | Bulk CSV import (aircraft, parts, customers) |
| MBP-0089 | Parts reorder alerts (min-stock threshold) |
| MBP-0090 | MEL deferral tracking with countdown |
| MBP-0091 | Shift handoff dashboard |
| MBP-0092 | Fleet calendar (upcoming inspections) |
| MBP-0093 | Expand E2E test coverage |
| MBP-0094 | Performance audit (bundle, lazy loading) |
| MBP-0095 | WCAG AA deep accessibility pass |

---

## Blocked on External Dependencies

| MBP | Title | Blocker |
|-----|-------|---------|
| MBP-0024 | QuickBooks integration | External OAuth — deferred |
| MBP-0013 | Logbook OCR ingestion | Needs OCR pipeline (Tesseract/cloud) |
| MBP-0031 | ADS-B telemetry | External feed API |
| MBP-0096–0102 | Customer portal (7 items) | Separate Clerk org or magic link auth |

---

## Recommended Build Priority

If building next, these groups deliver the most user value:

1. **File Upload + Photo system** (MBP-0063–0068) — Unlocks real file attachments across WOs, steps, discrepancies. Currently everything is metadata-only.
2. **Notification system** (MBP-0071–0076) — No in-app notifications exist. Users have zero awareness of status changes.
3. **PDF generation** (MBP-0077–0082) — Print/download for invoices, quotes, RTS, WOs. Essential for a real shop.
4. **Dashboard charts** (MBP-0056–0060) — Dashboard currently has limited visualization.
5. **Billing wiring** (MBP-0069–0070, 0119–0120) — Labor rates and tax aren't actually applied despite UI existing.
6. **Customer portal** (MBP-0096–0102) — Complete customer-facing experience.

---

*Source: `MASTER-BUILD-LIST.md` Registry B — 153 atomic features. Cross-referenced against codebase implementation state as of 2026-03-05.*
