# EBIS 5 vs Athelon MRO — Competitive Analysis

**Date**: 2026-02-27
**Sources**: ebiscloud.com, softwareadvice.com, aviationpros.com, sourceforge.net, itqlick.com, trustradius.com, veryon.com

---

## 1. Executive Summary

**EBIS 5** (by EBIS/Veryon — formerly Datcomedia) is a mature, 25+ year MRO management platform serving 4,000+ users across 300+ customers worldwide. It targets Part 145 repair stations, FBOs, and OEMs across both aircraft maintenance and GSE (Ground Support Equipment) management. EBIS was acquired by Veryon (formerly ATP/Aircraft Technical Publishers) and operates as a standalone cloud product at ebiscloud.com.

**Athelon** is a modern, cloud-native MRO SaaS built on Convex + React, currently at ~82% feature completion with 52 pages, 206 backend functions, and 52 schema tables. It targets the same Part 145 repair station market.

**Key Takeaway**: EBIS has broader feature coverage in areas like OTC sales, repair orders (8130-3 printing), Kanban boards, physical inventory, automatic scheduled reports, FAA database lookup, and QuickBooks integration that is production-ready. Athelon has a more modern tech stack, real-time architecture, and deeper workflow enforcement (step-by-step task execution, PIN-based e-signatures, discrepancy disposition workflows, per-line-item customer authorization). Both have significant gaps — EBIS's customer portal is still "Coming Soon"; Athelon lacks PDF generation, email, and several polish features.

---

## 2. Feature Matrix

| # | Feature | EBIS 5 | Athelon | Winner | Notes |
|---|---------|--------|---------|--------|-------|
| 1 | **Work Order Management** | ✅ Paperless WOs, Kanban boards (PRO), preventive maintenance, core credit tracking, returns management | ✅ WO list w/ tabs, create, detail, status workflow (draft→open→in-progress→complete→closed), task card linking | **EBIS** | EBIS has Kanban boards, core credit tracking, returns. Athelon has deeper status workflow enforcement |
| 2 | **Repair Orders / 8130-3** | ✅ Repair Orders with Authorized Release Certificates (8130-3, EASA Form 1) printing | ⚠️ Return-to-service module exists but PDF generation is a TODO stub | **EBIS** | Critical gap for Athelon — no 8130-3 / EASA Form 1 printing |
| 3 | **Task Cards / Step Execution** | ✅ Item signoffs, required inspection items configurable | ✅ Full task card system with step-by-step execution, PIN sign-off, IA enforcement, ratings validation | **Athelon** | Athelon's granular step execution with PIN auth and IA expiry checks is more sophisticated |
| 4 | **Parts & Inventory** | ✅ Parts management, parts kits, master parts list, serialized component tracking (PRO), part status/ETA, cores management, physical inventory (PRO), parts catalogs (PRO) | ✅ Parts tracking, stock, receiving, PO integration, part tags | **EBIS** | EBIS has serialized components, physical inventory, parts catalogs, cores management |
| 5 | **Billing & Invoicing** | ✅ Invoices with parts/labor/shipping/taxes, OTC sales (PRO) | ✅ Invoice CRUD, line items, payment history, send/void/pay workflows, immutability after SENT, batch ops | **Tie** | Both strong. EBIS has OTC; Athelon has batch operations and immutability enforcement |
| 6 | **Quotes / Estimates** | ✅ Quote automation (auto-complete on WO conversion), OTC quotes | ✅ Quotes with revision tracking, per-line-item customer authorization, quote→invoice and quote→WO conversion | **Athelon** | Athelon's per-line-item authorization and revision history are unique |
| 7 | **Purchase Orders** | ✅ PO management with P/O reminders dashboard (PRO) | ✅ PO list, create, detail, line items, receiving, budget tracking, submit/close workflows | **Tie** | EBIS has reminders dashboard; Athelon has budget warning indicators |
| 8 | **Scheduling** | ✅ Scheduler with calendar and agenda view (trainings, inspections, vacations) | ⚠️ Gantt board (visual scaffold only — no drag-drop), capacity planning page, backlog sidebar | **EBIS** | EBIS has working calendar/agenda. Athelon's Gantt is non-interactive |
| 9 | **Fleet / Aircraft Tracking** | ✅ Aircraft detail records (serial numbers, model, historical changes), fleet media, FAA database lookup | ✅ Aircraft list, detail (reg, type, TT, status), logbook, registration history, engine/propeller tracking | **Tie** | EBIS has FAA DB lookup; Athelon has logbook and registration history |
| 10 | **AD/SB Compliance** | ✅ Compliance items (Aircraft, Engine, Inspection types — PRO) | ✅ AD compliance module (6 functions), task compliance tracking | **Tie** | Both have compliance tracking; similar scope |
| 11 | **Document Management** | ✅ Media capabilities (unlimited photos, videos, documents), SOPs, scope of work, fleet media | ⚠️ Document upload URLs exist but actual file storage not wired | **EBIS** | Athelon's document system is incomplete |
| 12 | **Customer Management** | ✅ Record management for vendors, customers, aircraft, parts; owner authorization/rejection automation | ✅ Customer list, detail, notes, invoices, quotes, aircraft, WOs, tax exempt | **Tie** | Both solid CRM basics |
| 13 | **Reporting & Analytics** | ✅ WIP reporting, revenue reporting, automatic scheduled reports (PRO), Advanced Data Analyzer (PRO — profit margin, est vs worked hours) | ⚠️ Dashboard stat cards only — no charts, no export, no report generation | **EBIS** | Major Athelon gap — EBIS has production reporting + scheduled PDF delivery |
| 14 | **Mobile Access** | ✅ Mobile accessibility for technicians (real-time, remote) | ⚠️ Responsive design on all 52 pages but no PWA, no service worker, no offline | **EBIS** | EBIS has proven mobile; Athelon responsive but no true mobile app |
| 15 | **User Roles & Permissions** | ✅ User profiles linked to users, advanced configurations | ⚠️ Role system in schema but no admin UI for inviting/assigning roles | **EBIS** | Athelon has the backend but no management UI |
| 16 | **Electronic Signatures** | ✅ Item signoffs configurable | ✅ PIN-based sign-off (SHA-256 hash), IA expiry enforcement | **Athelon** | Athelon's PIN system with hash security is more robust |
| 17 | **Return to Service** | ✅ Repair orders → 8130-3/EASA Form 1 printing, logbook generation with FAA statements | ⚠️ RTS module exists but PDF generation is TODO | **EBIS** | Athelon can't generate RTS documents yet |
| 18 | **Quality Control** | ✅ Compliance items, required inspections | ✅ QCM review dashboard, IA-required steps, audit trail, conformity inspections (partial) | **Athelon** | Athelon has dedicated QCM dashboard and audit trail |
| 19 | **Time Clock / Labor** | ✅ Time clocks, time clock breakdown by day/technician (PRO), technician activity monitoring | ✅ Time clock (in/out), time approval (approve/reject), billing analytics | **Tie** | Both comprehensive. EBIS has breakdown analysis; Athelon has approval workflow |
| 20 | **Vendor Management** | ✅ Record management for vendors | ✅ Vendor list, create, detail, certifications, approval status, vendor services (5 functions) | **Athelon** | Athelon has richer vendor detail with certifications and approval workflow |
| 21 | **Multi-location** | ✅ City-based multi-shop (parts by city, OTC by city, master parts list across shops) | ⚠️ Schema supports it but no UI for cross-site routing | **EBIS** | EBIS has working multi-location; Athelon is schema-only |
| 22 | **API / Integrations** | ✅ Open API (PRO), QuickBooks Online integration, data import (Excel), telemetry integration | ⚠️ No QuickBooks, no API, no export | **EBIS** | EBIS has QB integration + open API. Major Athelon gap |
| 23 | **Training & Qualifications** | ✅ Certification tracking (certs, recurring training, policies) | ✅ Training module (convex/training.ts), technician certs/ratings | **Tie** | Both track certs and training |
| 24 | **Tool Management** | ✅ Tool transfer history by city/tool room | ✅ Tool crib module (convex/toolCrib.ts) | **Tie** | Both have tool tracking |
| 25 | **Shipping & Receiving** | ✅ Part status with ETAs, receiving against POs | ✅ Receive items against PO | **Tie** | Similar scope |
| 26 | **Warranty Management** | ✅ Warranty claims from WO items (PRO) | ❌ Not implemented | **EBIS** | Athelon has no warranty tracking |
| 27 | **Customer Portal** | ⚠️ "Coming Soon" — not yet available | ⚠️ Not built (P1 backlog) | **Tie** | Neither has it — race to market |
| 28 | **Notifications** | ✅ Targeted notifications with media attachments | ⚠️ notifications.ts exists but no UI (no bell icon, no push) | **EBIS** | Athelon has backend but no delivery |
| 29 | **Barcode/Scanning** | ❌ Not mentioned on website | ❌ Not implemented | **Tie** | Gap for both |
| 30 | **Multi-currency** | ❌ Not mentioned | ✅ currency.ts module exists | **Athelon** | Athelon has currency support in backend |
| 31 | **Kanban Boards** | ✅ Work Order Kanban Boards (PRO) | ❌ No Kanban — Gantt only | **EBIS** | Visual WO management advantage |
| 32 | **OTC (Over-the-Counter) Sales** | ✅ OTC quotes and invoices (PRO) | ❌ Not implemented | **EBIS** | Unique EBIS feature for walk-in parts sales |
| 33 | **Labor Kits & ATA Codes** | ✅ Labor kits with parts/external repairs, ATA code management | ❌ No labor kit concept | **EBIS** | Significant workflow efficiency feature |
| 34 | **Logbook Generation** | ✅ Auto-generate logbook entries with pre-configured FAA statements | ⚠️ Aircraft logbook page exists but no auto-generation | **EBIS** | EBIS auto-populates FAA logbook entries |
| 35 | **FAA Database Lookup** | ✅ Search FAA database when creating WOs | ❌ Not implemented | **EBIS** | Useful for aircraft validation |
| 36 | **Data Import** | ✅ Excel/CSV import | ⚠️ bulkImport.ts exists but no UI | **EBIS** | Athelon has backend but no user-facing import |
| 37 | **Discrepancy Management** | ⚠️ Basic (within WO items) | ✅ Full module — severity/priority, photo URLs, 6 disposition options, approved data reference required, auto-escalation | **Athelon** | Athelon's discrepancy workflow is significantly more sophisticated |
| 38 | **Billing Analytics** | ✅ Revenue reporting, profit margin, billable hours, estimated cash | ✅ AR dashboard, aging summary, credit memos, deposits, recurring billing, tax config | **Athelon** | Athelon has more complete financial tooling (AR, credit memos, deposits, recurring billing) |
| 39 | **Onboarding / Training** | ✅ Interactive training, guided onboarding, dedicated specialist, 10+ hours included | ⚠️ Self-service (no guided onboarding) | **EBIS** | EBIS has structured onboarding program |
| 40 | **Real-time Updates** | ⚠️ Standard web app | ✅ Convex real-time subscriptions — instant updates across all clients | **Athelon** | Athelon's architecture enables true real-time collaboration |

---

## 3. EBIS Unique Strengths (What EBIS Has That Athelon Doesn't)

1. **Repair Orders with 8130-3 / EASA Form 1 printing** — Critical for component repair stations
2. **Over-the-Counter (OTC) Sales** — Walk-in parts quotes and invoices, unique for FBOs
3. **Kanban Boards for Work Orders** — Visual WO prioritization (PRO plan)
4. **Labor Kits & ATA Codes** — Template-based labor items with auto-parts linking
5. **FAA Database Lookup** — Aircraft validation directly from FAA registry
6. **Automatic Scheduled Reports** — Configure PDF/export delivery on specific days
7. **Physical Inventory** — Dedicated inventory count workflow
8. **Advanced Data Analyzer** — Profit margin analysis, est vs actual hours, WO performance
9. **QuickBooks Online Integration** — Production-ready, no third-party middleware
10. **Open API** — Third-party integration capability (PRO)
11. **Logbook Auto-Generation** — Pre-configured FAA statements
12. **Serialized Component Tracking** — Serial number media management
13. **Parts Catalogs** — Fleet-specific parts catalogs (PRO)
14. **Cores Management** — Core credit and exchange tracking
15. **Working Multi-Location** — City-based shop management with cross-location views
16. **Warranty Claims** — Track and manage warranty work from WO items
17. **25+ Years of Industry Trust** — 4,000+ users, 300+ customers, established testimonials
18. **Structured Onboarding** — Dedicated specialist, 10+ hours, on-site options
19. **Telemetry Integration** — IoT/meter data for predictive maintenance (GSE focus)
20. **P/O Reminders Dashboard** — Proactive PO management

---

## 4. Athelon Advantages (What We Do Better)

1. **Modern Tech Stack** — React 19, Convex real-time backend, Tailwind 4, Clerk auth. Faster iteration, better DX
2. **Real-time Architecture** — Convex subscriptions mean every user sees changes instantly. EBIS is request-response
3. **Step-by-Step Task Execution** — Granular task card steps with individual PIN sign-off, not just WO-level signoffs
4. **PIN-Based Electronic Signatures** — SHA-256 hashed PINs with IA expiry enforcement
5. **Discrepancy Management** — 6 disposition options, severity auto-escalation, approved data reference required
6. **Per-Line-Item Customer Authorization** — Customers approve/decline individual quote items (not all-or-nothing)
7. **Quote Revision Tracking** — Full revision history with audit trail
8. **QCM Review Dashboard** — Dedicated IA-required step review interface
9. **Comprehensive Financial Tools** — AR dashboard, aging summary, credit memos, deposits, recurring billing templates, tax configuration — more complete than EBIS billing
10. **Invoice Immutability** — Enforced after SENT status (accounting integrity)
11. **Batch Invoice Operations** — Send, void, or pay multiple invoices at once
12. **Capacity Planning** — Tech shifts, utilization stats, workload calculation
13. **Multi-Currency Support** — International operations ready (backend)
14. **Vendor Certification & Approval** — Richer vendor management with approval workflows
15. **Audit Logging** — Comprehensive audit trail across all operations
16. **Modern UX** — Responsive design across 52 pages, error boundaries, loading skeletons
17. **Lower Infrastructure Cost** — Serverless (Convex + Vercel) vs traditional hosting
18. **Faster Feature Development** — Modern stack enables rapid iteration

---

## 5. Gap List — Prioritized Features Athelon Needs to Match/Beat EBIS 5

### P0 — Must Close Before Launch (EBIS Parity)

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P0-1 | **RTS / 8130-3 PDF Generation** | Can't serve component repair stations without it | Medium |
| P0-2 | **Invoice PDF Generation** | Can't send invoices to customers | Medium |
| P0-3 | **Quote PDF Generation** | Can't send quotes | Medium |
| P0-4 | **Work Order PDF/Print** | Basic business requirement | Medium |
| P0-5 | **Logbook Entry Generation** | Auto-populate FAA statements like EBIS | Medium |
| P0-6 | **QuickBooks Integration** | EBIS's #1 selling point for small shops | High |
| P0-7 | **File Upload (Real)** | Documents and photos must actually upload/store | Medium |
| P0-8 | **User/Role Management UI** | Admin must be able to invite and assign roles | Low |

### P1 — Competitive Parity

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P1-1 | **Reporting & Export** | EBIS has scheduled reports, WIP, revenue dashboards | High |
| P1-2 | **Repair Orders Module** | Separate from WOs — for component shops doing 8130-3 work | High |
| P1-3 | **OTC (Over-the-Counter) Sales** | EBIS differentiator for FBOs | Medium |
| P1-4 | **Kanban Board for WOs** | Visual management that EBIS PRO users love | Medium |
| P1-5 | **Labor Kits & ATA Codes** | Template efficiency for common jobs | Medium |
| P1-6 | **FAA Database Lookup** | Aircraft validation at WO creation | Low |
| P1-7 | **Notification System (UI)** | Bell icon, in-app alerts, push | Medium |
| P1-8 | **Email Integration** | Send invoices, quotes, notifications | High |
| P1-9 | **Physical Inventory** | Cycle count workflow | Medium |
| P1-10 | **Serialized Component Tracking** | Full serial/batch tracking with media | Medium |

### P2 — Differentiation & Market Win

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P2-1 | **Customer Portal** | Neither has it — first to market wins | High |
| P2-2 | **Warranty Claims** | EBIS PRO feature Athelon lacks | Medium |
| P2-3 | **Data Import (UI)** | Excel/CSV import for migration | Medium |
| P2-4 | **Open API** | Third-party integrations | High |
| P2-5 | **Parts Catalogs** | Fleet-specific catalog management | Medium |
| P2-6 | **Cores Management** | Core credit/exchange tracking | Medium |
| P2-7 | **Interactive Gantt (Drag-Drop)** | Better than EBIS's calendar view | High |
| P2-8 | **Multi-Location UI** | EBIS has this working; Athelon schema-only | Medium |

---

## 6. Pricing & Market Position

### EBIS Pricing
- **Model**: Cloud SaaS, subscription-based. Quote required (no public pricing).
- **Plans**: Two tiers — **ALL PLANS** (base) and **PRO** (advanced features like Kanban, repair orders, OTC, advanced analytics, warranty claims, physical inventory, automatic reports, open API)
- **Estimated Range**: $0–$99/month base (per ITQlick for older EBIS 3). EBIS 5 pricing likely higher given feature expansion. Competitor Web Manuals charges $180/user/month.
- **Onboarding**: Required. Virtual (10+ hours) or on-site (2 trainers, 2+ days). Additional training in 5-hour blocks.
- **Target**: Small to large Part 145 repair stations, FBOs, OEMs. Also GSE maintenance (separate product line).

### EBIS Market Position
- **Acquired by Veryon** (formerly ATP — Aircraft Technical Publishers / CaseBank Technologies)
- **4,000+ users, 300+ customers, 25+ years in market**
- **Strengths**: Trusted brand, proven at scale, dual aircraft/GSE capability
- **Weaknesses**: Legacy UX (rebuilt from scratch in v5 but still traditional web app), no real-time architecture, customer portal still "Coming Soon", no public API documentation

### Athelon Market Position
- **New entrant** — modern, cloud-native, real-time
- **Strengths**: Superior tech stack, real-time collaboration, deeper workflow enforcement, more sophisticated financial tools, lower infrastructure cost
- **Weaknesses**: Unproven in market, missing critical features (PDFs, QB, email), no established customer base
- **Pricing Strategy Opportunity**: Undercut EBIS on price while offering modern UX. Target shops frustrated with EBIS's legacy feel or migrating from EBIS 3.2→5 (required onboarding = churn risk).

---

## 7. Sources

- https://www.ebiscloud.com/ — Main site
- https://www.ebiscloud.com/solutions/aircraft-maintenance-software — Feature list
- https://www.ebiscloud.com/ebis-5-pro — PRO features and navigation
- https://www.ebiscloud.com/solutions/aircraft-maintenance-software/onboarding — Onboarding details
- https://www.ebiscloud.com/solutions/aircraft-maintenance-software/customer-portal — Customer portal (Coming Soon)
- https://www.softwareadvice.com/cmms/ebis-profile/ — Review listing
- https://www.aviationpros.com/airports/airport-technology/it-software/product/10137201/datcomedia-a-tronair-company-datcomedia-ebis-software — Product description
- https://sourceforge.net/software/product/EBis/ — Reviews
- https://veryon.com/press-media/introducing-the-new-atp — Veryon acquisition context
- https://www.itqlick.com/ebis-3/pricing — Pricing estimates
- https://www.trustradius.com/products/ebis/pricing — Pricing info
