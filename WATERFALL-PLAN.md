# Athelon MRO — Waterfall Build Plan

> Canonical plan pointer: this file is a contributing source. The authoritative consolidated build plan is [`apps/athelon-app/docs/plans/MASTER-BUILD-PLAN.md`](apps/athelon-app/docs/plans/MASTER-BUILD-PLAN.md).

**Created**: 2026-02-27
**Method**: Automated waterfall — each phase builds → tests → gates before next phase starts
**Gate Criteria**: `npx tsc --noEmit` = 0 errors, `npx convex dev --once` = success, functional verification

---

## Phase 1: Backend Critical Fixes ⏳
**Scope**: Fix broken business logic in existing Convex functions
**Agent**: Single backend agent (no frontend changes)
**Files**: `convex/billing.ts`, `convex/billingV4.ts`, `convex/taskCards.ts`, `convex/schema.ts`

| Fix | Description |
|---|---|
| TAX-001 | Invoice tax calculation — tax arg is accepted but ignored, always writes `tax: 0` |
| TAX-002 | `computeTaxForInvoice` in billingV4 — wire it into invoice creation flow |
| LABOR-001 | Labor rate auto-application — pricing rules exist but `unitPrice` always defaults to 0 |
| LABOR-002 | Wire `pricingProfiles` into invoice/quote line item creation |
| AUTH-001 | `completeStep` rating-to-step authorization — validate airframe/powerplant cert |
| SCHEMA-001 | Create `conformityInspections` table with proper indexes |
| SCHEMA-002 | Add conformity inspection mutations (create, complete, list) |

**Gate**: Convex deploy succeeds, no TypeScript errors

---

## Phase 2: PDF Generation 📄
**Scope**: Generate downloadable PDFs for invoices, quotes, RTS documents, WO summaries
**Dependencies**: Phase 1 (tax must work for invoice PDFs)
**Library**: `@react-pdf/renderer` (React-based, works in browser)

| Feature | Description |
|---|---|
| PDF-001 | Invoice PDF template (header, line items, totals, tax, payment terms) |
| PDF-002 | Quote PDF template (header, departments/sections, line items, terms) |
| PDF-003 | RTS document PDF (aircraft info, completed work, compliance items, signatures) |
| PDF-004 | Work order summary PDF (header, task cards, discrepancies, parts used) |
| PDF-005 | "Download PDF" button on invoice detail, quote detail, RTS, WO detail pages |
| PDF-006 | "Print" button using browser print with print-friendly CSS |

**Gate**: Can generate and download all 4 PDF types, TypeScript clean

---

## Phase 3: File Storage & Photo Upload 📸
**Scope**: Real file upload using Convex file storage, photo capture for steps/discrepancies
**Dependencies**: Phase 2

| Feature | Description |
|---|---|
| FILE-001 | Convex file storage integration (generateUploadUrl → store → getUrl) |
| FILE-002 | Reusable FileUpload component (drag-drop, click, preview) |
| FILE-003 | Photo upload on step sign-off (replace text URL field with actual upload) |
| FILE-004 | Photo upload on discrepancy creation |
| FILE-005 | Document attachment on work orders (actual files, not just metadata) |
| FILE-006 | Photo gallery component (thumbnail grid, lightbox view) |

**Gate**: Can upload, view, and delete files on steps, discrepancies, and WO documents

---

## Phase 4: User & Role Management 👥
**Scope**: Admin UI for inviting users, assigning MRO-specific roles
**Dependencies**: Phase 1

| Feature | Description |
|---|---|
| ROLE-001 | Define MRO roles: admin, shop_manager, qcm_inspector, lead_technician, technician, billing_clerk, customer |
| ROLE-002 | Admin settings page: invite user, assign role, deactivate |
| ROLE-003 | Role-based sidebar nav (hide billing from technicians, hide WO execution from billing) |
| ROLE-004 | Role-based route guards (redirect unauthorized) |
| ROLE-005 | Role display in personnel page |

**Gate**: Can invite user, assign role, verify nav/route restrictions per role

---

## Phase 5: Dashboard Charts & Reporting 📊
**Scope**: Real charts on dashboard, CSV/Excel export, basic reports
**Dependencies**: Phase 1 (correct billing data)
**Library**: `recharts` (lightweight, React-native)

| Feature | Description |
|---|---|
| CHART-001 | Dashboard: WO status distribution (pie/donut chart) |
| CHART-002 | Dashboard: Revenue trend (line chart, last 12 months) |
| CHART-003 | Dashboard: TAT performance (bar chart) |
| CHART-004 | Dashboard: Technician utilization (horizontal bar) |
| CHART-005 | Billing analytics: enhanced with real charts |
| EXPORT-001 | CSV export on all list pages (invoices, WOs, parts, fleet) |
| EXPORT-002 | Date range filter on exports |
| REPORT-001 | Monthly revenue report page |
| REPORT-002 | WO throughput report |

**Gate**: All charts render with real data, CSV downloads work

---

## Phase 6: Notification System 🔔
**Scope**: In-app notifications + bell icon + notification preferences
**Dependencies**: Phase 4 (roles determine notification routing)

| Feature | Description |
|---|---|
| NOTIF-001 | `notifications` table in schema (type, message, recipientId, read, createdAt) |
| NOTIF-002 | Bell icon in TopBar with unread count badge |
| NOTIF-003 | Notification dropdown panel |
| NOTIF-004 | Auto-generate notifications: WO status change, quote approved, invoice overdue, discrepancy critical |
| NOTIF-005 | Mark as read / mark all read |
| NOTIF-006 | Notification preferences page |

**Gate**: Notifications auto-generate on key events, bell shows count, can mark read

---

## Phase 7: Advanced Scheduling 📅
**Scope**: Interactive Gantt, constraint-based scheduling, bay allocation
**Dependencies**: Phase 1, Phase 5 (charts)

| Feature | Description |
|---|---|
| SCHED-001 | Interactive Gantt chart with drag-drop (resize, move WO bars) |
| SCHED-002 | Technician skill matching in drag-drop (warn if unqualified) |
| SCHED-003 | Hangar bay allocation view (which aircraft in which bay) |
| SCHED-004 | Bay conflict detection (double-booking warning) |
| SCHED-005 | Auto-schedule algorithm (assign WOs to bays + techs based on constraints) |
| SCHED-006 | TAT estimation based on historical data |
| SCHED-007 | Schedule snapshot/baseline comparison |

**Gate**: Can drag WOs on Gantt, auto-schedule resolves conflicts, bay view shows allocations

---

## Phase 8: Customer Portal 🌐
**Scope**: External-facing read-only portal for customers
**Dependencies**: Phase 2 (PDFs), Phase 6 (notifications)

| Feature | Description |
|---|---|
| PORTAL-001 | Customer login (separate Clerk org or magic link) |
| PORTAL-002 | Customer dashboard: active WOs, recent invoices, fleet status |
| PORTAL-003 | WO status tracking (timeline view) |
| PORTAL-004 | Quote review & approve/decline inline |
| PORTAL-005 | Invoice view & payment status |
| PORTAL-006 | Download PDFs (invoices, quotes, RTS) |
| PORTAL-007 | Message/request submission to shop |

**Gate**: Customer can login, view WOs, approve quote, download invoice PDF

---

## Phase 9: Polish & Quality 💎
**Scope**: UX polish, accessibility, testing, performance

| Feature | Description |
|---|---|
| POLISH-001 | Dark mode toggle in TopBar |
| POLISH-002 | Cmd-K command palette (search, navigate, quick actions) |
| POLISH-003 | Activity timeline on work orders |
| POLISH-004 | Keyboard shortcuts (N for new, E for edit, etc.) |
| POLISH-005 | PWA manifest + service worker + offline support |
| POLISH-006 | Bulk CSV import (aircraft, parts, customers) |
| POLISH-007 | Parts reorder alerts (min-stock threshold) |
| POLISH-008 | MEL deferral tracking with countdown timers |
| POLISH-009 | Shift handoff dashboard |
| POLISH-010 | Fleet calendar (upcoming inspections) |
| POLISH-011 | Expand E2E test coverage to all features |
| POLISH-012 | Performance audit (bundle size, lazy loading) |
| POLISH-013 | WCAG AA deep pass |

**Gate**: Lighthouse score >90, E2E coverage >60%, all features keyboard-accessible

---

## Execution Tracker

| Phase | Status | Started | Completed | Commit |
|---|---|---|---|---|
| 1. Backend fixes | ⏳ | | | |
| 2. PDF generation | ⬜ | | | |
| 3. File upload | ⬜ | | | |
| 4. User/role mgmt | ⬜ | | | |
| 5. Charts/reports | ⬜ | | | |
| 6. Notifications | ⬜ | | | |
| 7. Scheduling | ⬜ | | | |
| 8. Customer portal | ⬜ | | | |
| 9. Polish | ⬜ | | | |
