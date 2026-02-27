# Athelon MRO SaaS — Build Status & Remaining Work

**Last Updated**: 2026-02-27
**Stack**: Vite 6 + React 19 + React Router DOM 6 + Convex 1.32 + Clerk React + shadcn/ui + Tailwind 4
**Deployment**: Vercel (frontend) + Convex Cloud (backend)
**Repo**: github.com/Samdifer/Athalon-Open-Claw

---

## 📊 Current Stats

| Metric | Count |
|---|---|
| Convex backend modules | 21 |
| Convex exported functions | 206 |
| Schema tables | 52 |
| Frontend pages | 52 |
| Custom components | 85 |
| shadcn/ui components | 27 |
| Error boundaries | 22 |
| Loading skeletons | 17 |

---

## ✅ BUILT — Feature Inventory

### 1. Core Platform
- [x] Multi-tenant org architecture (Clerk orgs)
- [x] Auth: sign-in, sign-up, protected routes, session management
- [x] App shell: responsive sidebar, top bar, breadcrumbs
- [x] Dashboard with stat cards, recent activity, quick actions, schedule health widget
- [x] Global 404 / not-found page
- [x] Error boundaries on all major routes
- [x] Loading skeleton states on all major routes
- [x] Mobile responsiveness across all 52 pages
- [x] Audit logging (auditLog table)
- [x] Shop settings page

### 2. Fleet Management (3 pages, 7 backend functions)
- [x] Aircraft list with search/filter
- [x] Aircraft detail page (registration, type, TT, status)
- [x] Aircraft total time update (with decrease protection)
- [x] Aircraft logbook page
- [x] Registration history tracking
- [x] Engine and propeller tracking (schema)
- [x] AD compliance tracking per aircraft

### 3. Work Orders (11 pages, 15+ backend functions)
- [x] Work order list with tabs (active/completed/all), search, status filters
- [x] Create new work order (customer picker, aircraft selector)
- [x] Work order detail: header, status, task cards, discrepancies, documents
- [x] Customer-facing status control (external status updates)
- [x] Aircraft induction dialog (photo URLs, fuel qty, condition)
- [x] Induction records table
- [x] Task card list within work order
- [x] Create task card (manual or from template)
- [x] Task card detail with step execution
- [x] Step statuses: pending → in_progress → completed/deferred
- [x] Step sign-off dialog (PIN, rating, photos, measurements, parts removed)
- [x] Card-level sign-off dialog
- [x] Raise Finding / discrepancy dialog from task steps
- [x] Handoff notes on task cards
- [x] Maintenance records page
- [x] Return to Service (RTS) page with checklist + signoff
- [x] Signature authorization events
- [x] Customer release page
- [x] AD compliance tab on work orders
- [x] Document attachment panel
- [x] Vendor service picker modal

### 4. Inspection Templates (1 page, 3 backend functions)
- [x] Template list
- [x] Create template (name, aircraft type, inspection type, steps)
- [x] Create task card from template (auto-populates steps)
- [x] Add step to existing task card

### 5. Parts & Inventory (4 pages, 6+ backend functions)
- [x] Parts inventory list
- [x] Create new part
- [x] Parts requests page
- [x] Parts receiving inspection page (pass/reject/notes)
- [x] Part reservation for work orders
- [x] Part release from reservation
- [x] Part installation history tracking (schema)
- [x] Receiving inspection workflow (pending → inspected)

### 6. Squawks / Discrepancies (1 page, 5+ backend functions)
- [x] Discrepancy list with severity/priority badges
- [x] Create discrepancy (severity, priority, photo URLs, linked task step)
- [x] Disposition workflow (6 options: repaired, replaced, overhauled, serviceable, deferred customer, deferred next)
- [x] Disposition requires approved data reference
- [x] Auto-status escalation on critical/major severity

### 7. Personnel (1 page, 5 backend functions)
- [x] Technician list
- [x] Technician detail (certs, ratings, PIN)
- [x] PIN security (SHA-256 hash)
- [x] IA expiry enforcement in sign-off flows

### 8. My Work / Technician Portal (1 page)
- [x] Technician's assigned task cards and steps
- [x] Quick links to step execution

### 9. Compliance (3 pages, 6+ backend functions)
- [x] Compliance overview with fleet stats
- [x] Aircraft compliance cards
- [x] QCM review dashboard (IA-required steps)
- [x] Audit trail page
- [x] AD compliance module (6 functions)
- [x] Task compliance items tracking

### 10. Billing — Invoices (4 pages)
- [x] Invoice list with search, status tabs, overdue indicators
- [x] Batch operations (send, void, pay multiple)
- [x] Create invoice (manual or from work order — auto-populates labor + parts + tax)
- [x] Invoice detail: line items, payment history, status badges
- [x] Add/edit/remove line items
- [x] Due date setting, payment terms
- [x] Send/void/record payment workflows
- [x] Invoice immutability after SENT status

### 11. Billing — Quotes (3 pages)
- [x] Quote list with expiry warnings
- [x] Create quote with department sections
- [x] Quote detail: line items, revision history
- [x] Quote → Invoice conversion
- [x] Quote → Work Order conversion
- [x] Per-line-item customer authorization (approve/decline per discrepancy)
- [x] Revision tracking
- [x] Send/approve/decline workflows

### 12. Billing — Purchase Orders (3 pages)
- [x] PO list
- [x] Create PO with line items
- [x] PO detail: line items, receiving, budget tracking
- [x] PO budget warning indicators
- [x] Submit/close PO workflows
- [x] Receive items against PO

### 13. Billing — Vendors (3 pages, 9 backend functions)
- [x] Vendor list
- [x] Create vendor
- [x] Vendor detail: certifications, approval status
- [x] Vendor services module (5 functions)

### 14. Billing — Customers (2 pages, 2+ backend functions)
- [x] Customer list with mobile card view
- [x] Customer detail: notes, invoices, quotes, aircraft, work orders
- [x] Create/update customer
- [x] Customer notes
- [x] Tax exempt status

### 15. Billing — Financial Tools (7 pages)
- [x] AR (Accounts Receivable) dashboard with aging summary
- [x] Credit memos (create, issue, apply to invoice)
- [x] Deposits page (record deposit, apply to invoice)
- [x] Pricing rules page
- [x] Time clock (clock in/out)
- [x] Time approval (approve/reject time entries)
- [x] Billing analytics
- [x] Recurring billing templates (create, toggle, generate invoice)
- [x] Tax configuration (tax rates, customer exemptions)
- [x] Billing settings (approval thresholds, org defaults)

### 16. Scheduling (2 pages, 7 backend functions)
- [x] Scheduling page with Gantt board component
- [x] Backlog sidebar
- [x] Capacity planning page (tech shifts, utilization stats)
- [x] Scheduling settings (shop hours, etc.)
- [x] Technician shift management
- [x] Technician workload calculation
- [x] Shop capacity / utilization queries

### 17. Documents (backend only, 6 functions)
- [x] Document upload URL generation
- [x] Save/list/delete documents
- [x] Document URL retrieval

---

## 🔴 NOT BUILT — Remaining Work

### P0 — Critical Gaps (Must-have for production)

| # | Feature | Module | Notes |
|---|---|---|---|
| 1 | **RTS PDF generation** | Work Orders | `generateRtsDocument` is a TODO stub in `returnToService.ts` — no actual PDF output |
| 2 | **Work order PDF/print** | Work Orders | No print-friendly view or PDF export for WOs |
| 3 | **Invoice PDF generation** | Billing | No PDF export for invoices to send to customers |
| 4 | **Quote PDF generation** | Billing | No PDF export for quotes |
| 5 | **Email notifications** | Platform | No email sending capability (Gmail API not integrated) |
| 6 | **Real file upload** | Documents | `generateUploadUrl` exists but actual S3/Convex file storage not wired |
| 7 | **Photo upload** | Work Orders | Photo URLs are text fields — no actual upload/camera integration |
| 8 | **User/role management** | Platform | No admin page for inviting users, assigning roles (technician, manager, QCM) |
| 9 | **Conformity inspections** | Compliance | Phase 7 gap — `conformityInspections` table never created |
| 10 | **Rating-to-step auth check** | Work Orders | `completeStep` doesn't validate airframe/powerplant cert against `ratingsExercised` |
| 11 | **Labor rate auto-application** | Billing | Pricing rules exist but `unitPrice` always defaults to 0 — never auto-applied |
| 12 | **Tax calculation in invoices** | Billing | Tax arg accepted but always creates invoice with `tax: 0` |

### P1 — Competitive Features (Needed for market readiness)

| # | Feature | Module | Notes |
|---|---|---|---|
| 13 | **Advanced scheduling engine** | Scheduling | Current Gantt is visual scaffold only — no drag-drop, no constraint solver, no auto-schedule |
| 14 | **Hangar bay visualization** | Scheduling | No bay allocation view ("what's in which bay") |
| 15 | **Drag-and-drop Gantt** | Scheduling | GanttBoard component is ~500 lines but not interactive |
| 16 | **Customer portal** | Platform | No external-facing portal for customers to view WO status, approve quotes |
| 17 | **QuickBooks integration** | Billing | FEAT-110 deferred — needs OAuth |
| 18 | **Reporting / export** | Platform | No report generation, CSV export, or data export |
| 19 | **Dashboard real charts** | Dashboard | Stat cards show numbers but no trend charts (Chart.js / Recharts) |
| 20 | **Notification system** | Platform | No in-app notifications, no push, no bell icon |
| 21 | **Search improvements** | Platform | `globalSearch` backend exists but TopBar search UX is minimal |
| 22 | **Predictive TAT** | Scheduling | Research done (ML-based) but nothing implemented |
| 23 | **Multi-shop support** | Platform | Schema supports it but no UI for cross-site routing |

### P2 — Polish & Differentiators

| # | Feature | Module | Notes |
|---|---|---|---|
| 24 | **Dark mode** | Platform | ThemeProvider exists but theme toggle not in UI |
| 25 | **Mobile PWA** | Platform | No manifest, no service worker, no offline support |
| 26 | **Keyboard shortcuts** | Platform | No cmd-K palette, no keyboard nav |
| 27 | **Bulk import** | Platform | No CSV import for aircraft, parts, customers |
| 28 | **Barcode/QR scanning** | Parts | No scanner integration for part lookup |
| 29 | **Activity feed / timeline** | Work Orders | No visual timeline of WO events |
| 30 | **Shift handoff dashboard** | Personnel | Handoff notes exist but no dedicated shift-change view |
| 31 | **Fleet calendar** | Fleet | No calendar view for upcoming inspections |
| 32 | **Parts reorder alerts** | Parts | No min-stock tracking or reorder notifications |
| 33 | **WCAG deep compliance** | Platform | Deferred: aria-required, aria-describedby, aria-live regions |
| 34 | **E2E test coverage** | Testing | 10 auth E2E tests pass but limited feature coverage |
| 35 | **Technician fatigue tracking** | Personnel | Research identified as gap in all competitors |
| 36 | **MEL deferral tracking** | Compliance | Cat A/B/C/D timelines as scheduling constraints not implemented |

### Deferred from Earlier Phases

| Item | Notes |
|---|---|
| Phase 2.1: `counterSignStep` | Dedicated dual-signature fields |
| Phase 4.1: `partTagQuantityUsed` | Org-level AD thresholds, work scope vs Part 145 ratings check |
| BP-01: Marcus WO item | Specific WO template |

---

## 📈 Build Metrics

| Category | Built | Remaining | % Complete |
|---|---|---|---|
| Core platform | 10/10 | 0 | 100% |
| Work orders | 18/20 | 2 (PDF, rating check) | 90% |
| Fleet management | 7/7 | 0 | 100% |
| Parts & inventory | 8/9 | 1 (real file upload) | 89% |
| Billing | 35/38 | 3 (PDF, tax calc, labor rates) | 92% |
| Compliance | 7/9 | 2 (conformity, MEL) | 78% |
| Scheduling | 3/8 | 5 (engine, drag-drop, auto) | 38% |
| Personnel | 4/6 | 2 (roles, fatigue) | 67% |
| Platform infra | 5/12 | 7 (email, notif, export, etc.) | 42% |
| **Overall** | **~97/119** | **~22** | **~82%** |

---

## 🏗️ Recommended Build Order (Next Sprints)

### Sprint Next: PDF + Email (Critical Path)
1. Invoice PDF generation (Convex action → PDF → Convex file storage)
2. Quote PDF generation
3. RTS document PDF generation
4. Work order summary PDF
5. Gmail API integration for sending

### Sprint +1: Scheduling Engine (Competitive Moat)
6. Interactive Gantt with drag-drop (use @hello-pangea/dnd or similar)
7. Constraint-based auto-scheduling
8. Hangar bay allocation view
9. Technician skill-matching in scheduling
10. TAT prediction model

### Sprint +2: Customer Experience
11. Customer portal (read-only WO status, quote approval)
12. In-app notification system
13. Real-time status updates
14. CSV/Excel export

### Sprint +3: Polish
15. Dark mode toggle
16. Keyboard shortcuts (cmd-K)
17. Bulk data import
18. Advanced reporting
