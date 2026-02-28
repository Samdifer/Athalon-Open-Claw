# MASTER BUILD LIST — Athelon MRO Platform
**Created:** 2026-02-28
**Source:** DOM/QCM simulation findings + Corridor competitive analysis + gap audit

---

## Priority Tiers
- **P0 — Critical**: Blocks basic MRO workflow (found during simulation)
- **P1 — High**: Competitive gap with Corridor, required for sales
- **P2 — Medium**: Nice to have, improves UX/completeness
- **P3 — Low**: Future / external dependency

---

## P0 — CRITICAL (Simulation Blockers)

| # | Feature | Issue Found | Backend | Frontend | Est |
|---|---------|-------------|---------|----------|-----|
| 1 | **Dual Sign-off (Tech + Inspector)** | Schema only has `signingTechnicianId` — no separate inspector vs RTS signer fields. Part 145 requires tech sign-off AND independent inspector sign-off | FIX schema: add `inspectorTechnicianId`, `inspectorSignedAt`, `rtsTechnicianId`, `rtsSignedAt` | Update WO detail / task card UI | 2h |
| 2 | **PDF Generation — Invoices** | All PDF buttons are TODO stubs. Cannot send invoices to customers | Wire `@react-pdf/renderer` to invoice data | Invoice detail page PDF button | 3h |
| 3 | **PDF Generation — Quotes** | Quote PDF is a stub | Wire `@react-pdf/renderer` to quote data | Quote detail page PDF button | 2h |
| 4 | **PDF Generation — RTS / 8610-2** | Return-to-service document generation is a stub. Required for aircraft release | Build FAA Form 8610-2 template + RTS certificate | WO release page | 4h |
| 5 | **PDF Generation — Work Order Pack** | No WO printout capability — shops need paper trail | Build WO summary + task card list PDF | WO detail page | 3h |
| 6 | **Email / Notifications System** | Zero email capability. Cannot send invoices, quotes, or alerts | Wire email provider (Resend/SendGrid) or stub with Convex action | Settings page + send buttons on invoices/quotes | 4h |
| 7 | **Pricing Rules — Auto-Application** | Pricing module exists but always returns $0. Labor rates not applied to quotes/invoices | Fix `pricing:computeRate` to actually look up org pricing rules and apply | Verify pricing flows into quote/invoice creation | 2h |
| 8 | **Tax Calculation** | Tax config page exists but `computeTaxForInvoice` always returns 0 | Fix tax computation to use org tax rates from `taxRates` table | Verify tax auto-populates on invoices | 1h |
| 9 | **Document Upload / Attachments** | Backend has 6 functions but no real file upload wired. Cannot attach photos, manuals, etc. | Wire Convex file storage for uploads | Add upload dropzone to WO detail, task cards, discrepancies | 4h |
| 10 | **Customer Portal (ServiceEdge equivalent)** | `customerPortal.ts` has 7 functions but no frontend pages | Backend exists | Build `/portal` routes: WO status, aircraft list, invoice history, quote approval | 6h |

---

## P1 — HIGH (Corridor Competitive Gaps)

| # | Feature | Corridor Has | Backend | Frontend | Est |
|---|---------|-------------|---------|----------|-----|
| 11 | **Barcoding / QR Scanning** | System-wide barcode scanning for parts, tools, WOs | Add barcode fields to parts/tools schema, generate QR codes | Camera scanner component + QR code display on parts/WO pages | 6h |
| 12 | **Reports & Analytics Dashboard** | PowerBI integration, job performance, delivery metrics | Build report queries: WO turnaround time, labor utilization, revenue by customer, parts usage | `/reports` page with recharts dashboards + CSV export | 8h |
| 13 | **Scheduling — Drag-Drop Gantt** | Full planning & scheduling module | Already have `scheduling.ts` + `capacity.ts` — need drag-drop mutations | Replace static Gantt with draggable bars, save schedule changes | 6h |
| 14 | **Scheduling — Auto-Schedule** | Resource-constrained scheduling | Build constraint solver: bay capacity × tech availability × priority | "Auto-Schedule" button on scheduling page | 4h |
| 15 | **Role Management Admin UI** | Robust security and access controls | `roles.ts` has 5 functions | Build `/settings/users` role assignment UI — assign/revoke roles, permission matrix | 4h |
| 16 | **Training & Qualifications Mgmt** | Dedicated module — manage/enforce personnel qualifications | `training.ts` has 8 functions | Build `/personnel/training` with full CRUD: add training records, set requirements, track expiry, compliance dashboard | 4h |
| 17 | **Multi-Location Cross-Site UI** | Enterprise multi-facility support | `shopLocations.ts` exists | Build location switcher in header, cross-site parts transfer UI, location-scoped dashboards | 4h |
| 18 | **Warranty Management** | Dedicated warranty adjudication module | `warranty.ts` has 8 functions | Build warranty claims list, create/submit/approve flow, link to WO/invoice | 4h |
| 19 | **Tool Crib Management** | Dedicated tool management, calibration tracking | `toolCrib.ts` has 8 functions | Build `/parts/tools` with full CRUD: check-in/out, calibration due list, tool usage history | 4h |
| 20 | **AD/SB Fleet Compliance Dashboard** | Regulatory compliance module with CAMP Connect | `adCompliance.ts` has 6 functions | Enhance `/compliance/ad-sb`: fleet-wide AD matrix, due-date tracking, bulk import ADs | 4h |

---

## P2 — MEDIUM (UX & Completeness)

| # | Feature | Issue | Backend | Frontend | Est |
|---|---------|-------|---------|----------|-----|
| 21 | **Overtime / Shift Management** | Time clock lacks overtime rules, shift definitions | Add shift schedules, overtime thresholds to schema | Time clock settings + overtime flagging on time approval | 3h |
| 22 | **Discrepancy Disposition Workflow** | All 11 discrepancies in sim stayed "open" — no UI to disposition | Backend exists (`discrepancies.ts`) | Add disposition dialog: corrective action, parts used, sign-off, MEL deferral | 3h |
| 23 | **Work Order Close Readiness** | `getCloseReadiness` query exists but no UI shows it | Backend exists | Add close-readiness checklist panel on WO detail page | 2h |
| 24 | **Squawk Board Enhancements** | Squawk page exists but doesn't show severity/priority badges | Backend has severity/priority fields | Add color-coded severity badges, filter by priority, link to WO | 2h |
| 25 | **Search — Global Search** | `globalSearch` query exists but no search bar in UI | Backend exists | Add command-palette search (⌘K) with results across aircraft, WOs, parts, customers | 3h |
| 26 | **Dashboard KPIs** | Dashboard exists but limited real-time metrics | Add dashboard aggregate queries | KPI cards: active WOs, AOG count, overdue invoices, parts on order, utilization % | 3h |
| 27 | **Kanban — Drag-Drop** | Kanban board is visual only, no drag | Backend `updateWorkOrderStatus` exists | Add drag-drop between status columns on kanban page | 3h |
| 28 | **Handoff Notes** | Schema supports handoff notes but no UI | Backend `addHandoffNote` exists | Add shift handoff panel on task card detail | 2h |
| 29 | **Fleet Calendar Enhancements** | Calendar page exists but sparse | `fleetCalendar.ts` has 1 function | Add maintenance due dates, AD due dates, inspection intervals to calendar | 3h |
| 30 | **Conformity Inspection** | `conformityInspections.ts` has 4 functions, no frontend | Backend exists | Build conformity inspection page linked from receiving | 2h |

---

## P3 — LOW (External Dependencies / Future)

| # | Feature | Dependency | Est |
|---|---------|-----------|-----|
| 31 | **CAMP Connect Integration** | External API access required (CAMP/Hearst partnership) | Blocked |
| 32 | **QuickBooks Integration** | External OAuth + QuickBooks API | 8h when unblocked |
| 33 | **Multi-Currency** | `currency.ts` has 6 functions — needs UX design for currency switching | 4h |
| 34 | **ILS Parts Marketplace** | External API (ILS Bridge) | Blocked |
| 35 | **AI Predictive Maintenance** | `predictions.ts` backend exists — needs ML model or heuristic engine | 8h |
| 36 | **eCommerce / Parts Sales** | Payment provider integration required | Blocked |
| 37 | **Vertex Tax Integration** | External API | 4h when unblocked |
| 38 | **UPS WorldShip Integration** | External API | Blocked |
| 39 | **FBO Line Sales** | Different market segment — not building | N/A |
| 40 | **Native Mobile App** | PWA covers this adequately for now | Future |

---

## Build Order (Recommended)

### Sprint 1: P0 Critical Path (8 items, ~25h)
1. Dual sign-off schema fix (#1)
2. PDF generation — invoices, quotes, RTS, WO pack (#2-5)
3. Tax calculation fix (#8)
4. Pricing rules fix (#7)
5. Document upload (#9)

### Sprint 2: P0 + P1 High Priority (6 items, ~26h)
6. Email/notifications (#6)
7. Customer portal (#10)
8. Reports & analytics (#12)
9. Barcoding/QR (#11)
10. Role management UI (#15)

### Sprint 3: P1 Corridor Parity (6 items, ~24h)
11. Scheduling drag-drop + auto-schedule (#13-14)
12. Training & qualifications UI (#16)
13. Multi-location UI (#17)
14. Warranty management UI (#18)
15. Tool crib UI (#19)
16. AD fleet compliance dashboard (#20)

### Sprint 4: P2 Polish (10 items, ~26h)
17-26. Items #21-30

### Sprint 5: P3 Integrations (as dependencies unblock)
27-40. Items #31-40

---

## Metrics
- **Total features**: 40
- **P0 Critical**: 10 (~25h)
- **P1 High**: 10 (~48h)  
- **P2 Medium**: 10 (~26h)
- **P3 Low/Blocked**: 10 (varies)
- **Estimated total buildable now**: 30 features, ~99h
- **Current completion**: ~82% → Target after Sprint 3: ~95%

---

## Autonomous Improvements

### Cycle 2 — 2026-02-28 (Workflow Fidelity)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-004 | Wire task card compliance items to Convex backend — replace `useState(INITIAL_COMPLIANCE_ITEMS)` with `useQuery(api.taskCompliance.getComplianceItemsForTask)` + `addComplianceItem` / `updateComplianceStatus` mutations. Under a Part 145 audit, compliance changes must persist — currently all edits evaporate on page reload. | P0 | 1.5h | `tasks/[cardId]/page.tsx` | 🔄 In Progress |
| AI-005 | Wire vendor services on task card page to Convex backend — replace `useState(INITIAL_VENDOR_SERVICES)` with `useQuery(api.taskCardVendorServices.getVendorServicesForTask)` + `addVendorServiceToTask` / `updateVendorServiceStatus` mutations. Vendor service assignments currently evaporate on page reload. | P1 | 1h | `tasks/[cardId]/page.tsx` | 🔄 In Progress |
| AI-006 | Wire `Log Squawk` button in `DiscrepancyList` — button renders but has no `onClick`. Add a `LogSquawkDialog` component and call `api.discrepancies.openDiscrepancy`. Pass required props (`orgId`, `workOrderId`, `techId`) from the WO detail page. | P1 | 1h | `_components/DiscrepancyList.tsx`, `work-orders/[id]/page.tsx` | 🔄 In Progress |

### Cycle 1 — 2026-02-28 (Regulatory Compliance)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-001 | Replace hardcoded `demoTaskCompliance` in `WOComplianceTab` with real Convex data from `api.taskCompliance.getComplianceItemsForWorkOrder`. A DOM inspector walking in sees fake task compliance data today. | P0 | 1h | `WOComplianceTab.tsx` | ✅ Done |
| AI-002 | Replace hardcoded `demoRtsChecklist` and `rtsCompleted = false` in `ReturnToServiceSection` with real data from `api.returnToService.getCloseReadinessReport`. RTS section always shows "not complete" even when RTS is signed. | P0 | 1h | `WOComplianceTab.tsx` | ✅ Done |
| AI-003 | Make the Compliance tab badge on WO detail page dynamic — compute actual non-compliance from real AD + task compliance data instead of hardcoded amber dot. | P1 | 0.5h | `work-orders/[id]/page.tsx` | ✅ Done |
| BUG-001 | `dashboard/page.tsx` line 90: `wo.discrepancyCount` → `wo.openDiscrepancyCount` (pre-existing TS error) | P0 | 5m | `dashboard/page.tsx` | ✅ Done |
| BUG-002 | `work-orders/page.tsx` line 440: `wo.workOrderNumber` on `WorkOrderRow` type → `wo.number` (pre-existing TS error) | P0 | 5m | `work-orders/page.tsx` | ✅ Done |
