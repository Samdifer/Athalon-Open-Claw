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
| AI-004 | Wire task card compliance items to Convex backend — replace `useState(INITIAL_COMPLIANCE_ITEMS)` with `useQuery(api.taskCompliance.getComplianceItemsForTask)` + `addComplianceItem` / `updateComplianceStatus` mutations. Under a Part 145 audit, compliance changes must persist — currently all edits evaporate on page reload. | P0 | 1.5h | `tasks/[cardId]/page.tsx` | ✅ Done |
| AI-005 | Wire vendor services on task card page to Convex backend — replace `useState(INITIAL_VENDOR_SERVICES)` with `useQuery(api.taskCardVendorServices.getVendorServicesForTask)` + `addVendorServiceToTask` / `updateVendorServiceStatus` mutations. Vendor service assignments currently evaporate on page reload. | P1 | 1h | `tasks/[cardId]/page.tsx` | ✅ Done |
| AI-006 | Wire `Log Squawk` button in `DiscrepancyList` — button renders but has no `onClick`. Add a `LogSquawkDialog` component and call `api.discrepancies.openDiscrepancy`. Pass required props (`orgId`, `workOrderId`, `techId`) from the WO detail page. | P1 | 1h | `_components/DiscrepancyList.tsx`, `work-orders/[id]/page.tsx` | ✅ Done |

### Cycle 1 — 2026-02-28 (Regulatory Compliance)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-001 | Replace hardcoded `demoTaskCompliance` in `WOComplianceTab` with real Convex data from `api.taskCompliance.getComplianceItemsForWorkOrder`. A DOM inspector walking in sees fake task compliance data today. | P0 | 1h | `WOComplianceTab.tsx` | ✅ Done |
| AI-002 | Replace hardcoded `demoRtsChecklist` and `rtsCompleted = false` in `ReturnToServiceSection` with real data from `api.returnToService.getCloseReadinessReport`. RTS section always shows "not complete" even when RTS is signed. | P0 | 1h | `WOComplianceTab.tsx` | ✅ Done |
| AI-003 | Make the Compliance tab badge on WO detail page dynamic — compute actual non-compliance from real AD + task compliance data instead of hardcoded amber dot. | P1 | 0.5h | `work-orders/[id]/page.tsx` | ✅ Done |
| BUG-001 | `dashboard/page.tsx` line 90: `wo.discrepancyCount` → `wo.openDiscrepancyCount` (pre-existing TS error) | P0 | 5m | `dashboard/page.tsx` | ✅ Done |
| BUG-002 | `work-orders/page.tsx` line 440: `wo.workOrderNumber` on `WorkOrderRow` type → `wo.number` (pre-existing TS error) | P0 | 5m | `work-orders/page.tsx` | ✅ Done |

### Cycle 4 — 2026-02-28 (UI/UX Quality)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-010 | Fix `squawks/page.tsx` dark-mode color system — replace all hardcoded Tailwind color literals (`text-gray-900`, `text-gray-500`, `bg-blue-50`, `bg-red-50`, `bg-amber-50`, `text-blue-600`, `text-red-600`, `text-amber-600`) with CSS variable tokens matching app design system. Replace hand-rolled loading spinner with `Skeleton` components. Fix "New Squawk" disabled button — replace with a navigable link to work orders (squawks require WO context). | P1 | 30m | `squawks/page.tsx` | ✅ Done |
| AI-011 | Fix `dashboard/page.tsx` — make date subtitle dynamic (was hardcoded "Mon, Feb 23, 2026"). Replace duplicate static `stats` grid (4 fake-data cards) with a `LiveSecondaryKPIs` component that queries real parts-awaiting-inspection count (`api.parts.listParts` with `pending_inspection` filter) and expiring cert count (`api.technicians.listWithExpiringCerts`). The old `stats` row duplicated the live KPI cards above it with fabricated numbers. | P1 | 1h | `dashboard/page.tsx` | ✅ Done |
| AI-012 | Fix `dashboard/page.tsx` — replace hardcoded `activeWorkOrders` demo array with live Convex data from `api.workOrders.getWorkOrdersWithScheduleRisk`. Dashboard "Active Work Orders" card was showing N192AK, N76LS, N416AB with fake task/squawk counts — never reflected real WOs. Add `LiveActiveWorkOrders` component that fetches live, sorts AOG-first, caps at 5. | P1 | 1h | `dashboard/page.tsx` | ✅ Done |

### Cycle 5 — 2026-02-28 (Data Integrity)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-013 | Fix `CloseReadinessPanel.tsx` stub close handler — `handleClose()` was calling `toast.success("Work order closed successfully")` without any Convex mutation. WO never actually closed in the backend (silent data integrity failure). Replaced stub with `navigate(\`/work-orders/${workOrderId}/rts\`)` which routes to the full RTS authorization flow (signatureAuthEventId, RTS statement, aircraft hours). | P0 | 30m | `components/CloseReadinessPanel.tsx` | ✅ Done |
| AI-014 | Fix `CloseReadinessPanel.tsx` fragile string-matching checklist — CHECKLIST_ITEMS used `b.toLowerCase().includes("task card")` etc. to detect blockers. The status blocker `"Work order status is 'X'"` matched nothing and silently showed green. Replaced with direct backend blocker display — actual blocker messages verbatim with XCircle icons. No string guessing. | P1 | 20m | `components/CloseReadinessPanel.tsx` | ✅ Done |
| AI-015 | Fix MEL deferral in `DiscrepancyDispositionDialog.tsx` — previously showed `toast.error("MEL deferral requires pre-signing auth")` and did nothing. No "full deferral workflow" page exists. MEL deferrals are a 14 CFR 91.213/MMEL regulatory requirement. Added `signatureAuthEventId` input + `melDeferralDate` field to MEL path. Wired to `api.discrepancies.deferDiscrepancy`. Added optional `workOrderId` prop so signature page link can be constructed. Updated `squawks/page.tsx` to pass `workOrderId` to dialog. | P0 | 1h | `components/DiscrepancyDispositionDialog.tsx`, `app/(app)/squawks/page.tsx` | ✅ Done |

### Cycle 3 — 2026-02-28 (Parts Traceability)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-007 | Replace hand-rolled toast state (`useState` + `setTimeout`) in `parts/page.tsx` with `toast` from `sonner`. The page currently uses a custom `<div>` overlay instead of the app-standard `sonner` toast — a direct violation of coding rules. Also removes the `showToast()` wrapper function. | P1 | 30m | `parts/page.tsx` | ✅ Done |
| AI-008 | Upgrade `parts/new/page.tsx` to capture FAA 8130-3 / cert fields at receive time. Current form only collects partNumber, partName, qty, supplier — zero traceability data. A Part 145 receiving clerk MUST record cert type, cert number, serial number, condition, and receiving date. Upgrade form to use `api.parts.receivePart` (not `createPart`) when cert data is present, with collapsible sections for life-limited and shelf-life data. | P0 | 2h | `parts/new/page.tsx` | ✅ Done |
| AI-009 | Add Inspect action to `parts/requests/page.tsx` (Parts Queue). Parts in `pending_inspection` have no action button on this page — the clerk sees the part but can't act on it without navigating elsewhere. Add inline `InspectDialog` + Inspect button using `api.gapFixes.completeReceivingInspection`. | P1 | 1h | `parts/requests/page.tsx` | ✅ Done |

### Cycle 7 — 2026-02-28 (Testing Gaps)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-019 | Add E2E interaction tests for `DiscrepancyDispositionDialog` — verifies MEL deferral path (AI-015 fix) renders amber 14 CFR 91.213 warning, all 5 MEL fields (item number, category, deferral date, auth event ID), and that Submit button is disabled until required fields are filled. Also tests Corrected path requires corrective action text. Tests are data-resilient: `test.skip()` if no squawks exist in org. 9 tests total. | P1 | 1h | `e2e/wave5-discrepancy-disposition.spec.ts` (new) | ✅ Done |
| AI-020 | Add E2E interaction tests for Parts Receive form `/parts/new` — verifies 8130-3 cert section toggle exists and is collapsed by default (AI-008 fix), expanding it reveals Approval Number, Form Tracking Number, Approving Authority, Applicant Name, Authorized Signatory fields. Also tests partial cert data triggers validation error. Life-limited and shelf-life section toggles also tested. 11 tests total. | P1 | 1h | `e2e/wave5-parts-receive.spec.ts` (new) | ✅ Done |
| AI-021 | Add E2E interaction tests for billing/inventory pages — tests labor-kits "New Labor Kit" dialog (AI-016 fix): form opens, has Name + ATA Chapter fields, Save disabled until name filled, Cancel closes. Tests inventory-count reconcile uses shadcn AlertDialog NOT window.confirm (AI-017 fix): verifies `browserDialogTriggered = false` when clicking Reconcile. Documents remaining `confirm()` regression risk on delete/complete-count for next cycle. 8 tests total. | P1 | 1h | `e2e/wave5-billing-integrity.spec.ts` (new) | ✅ Done |

### Cycle 6 — 2026-02-28 (Error Handling)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-016 | Fix `billing/labor-kits/page.tsx` — `handleSave()`, `duplicateKit()`, `toggleKit()`, and `deleteKit()` all fire Convex mutations with zero error handling. No try/catch, no toast feedback, no submitting state (allows double-submit). Delete uses bare browser `confirm()`. Add: `import { toast } from "sonner"`, wrap all mutations in try/catch with `toast.success`/`toast.error`, add `isSubmitting` state to dialog save button, add Loader2 spinner. Also fix UI design to match app design system (header uses `text-2xl font-bold` instead of smaller standard). | P1 | 45m | `billing/labor-kits/page.tsx` | ✅ Done |
| AI-017 | Fix `parts/inventory-count/page.tsx` — `handleCreate()`, `handleStart()`, `completeCount()`, `reconcileCount()`, `deleteCount()`, and inline `recordItem()` in `onBlur` handlers all have zero error handling. `reconcileCount` is a **destructive irreversible action** (permanently adjusts stock quantities) gated only by a bare `confirm()` dialog. Add: `import { toast } from "sonner"`, wrap all mutations in try/catch with `toast.success`/`toast.error`, replace `confirm()` for reconcile with `AlertDialog` (shadcn/ui). Add loading states to action buttons. Also installed `alert-dialog` shadcn component (was missing). | P0 | 1h | `parts/inventory-count/page.tsx`, `components/ui/alert-dialog.tsx` (new) | ✅ Done |
| AI-018 | Fix `billing/credit-memos/page.tsx` — `handleIssue()` has a `catch` block that only calls `console.error()`. Error is silently swallowed, user sees no feedback when issuing a credit memo fails. Add `toast.success("Credit memo issued")` on success and `toast.error(...)` in catch. Add `issuingId` state to show loading indicator and prevent double-issue on the Issue button. | P1 | 20m | `billing/credit-memos/page.tsx` | ✅ Done |

### Cycle 10 — 2026-02-28 (Workflow Fidelity — 2nd pass)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-028 | Wire `onStartClick` + `isStarting` in `tasks/[cardId]/page.tsx` to `api.gapFixes.startStep` — `TaskStepRow` has had a "Start" button since GAP-18 but the props were never passed from the parent page. Without this wire-up, the Start button never renders and techs can't mark steps as "in_progress". They go straight from pending to signed with no intermediate "actively working" state — no visibility for the DOM into what work is happening. Added `startStepMutation = useMutation(api.gapFixes.startStep)`, `startingStepId` state, `handleStartStep()` function, and passed `onStartClick={handleStartStep}` + `isStarting={startingStepId === step._id}` to every `TaskStepRow`. | P1 | 30m | `tasks/[cardId]/page.tsx` | ✅ Done |
| AI-029 | Fix silent handoff note failure in `tasks/[cardId]/page.tsx` — `catch` block was empty (`// Error will show in console; could add toast later`). When `addHandoffNote` fails (network error, Convex down, auth expiry), the note is silently dropped — the form resets, the tech thinks the note was saved, and the handoff communication is lost at 2 AM mid-job. Changed `catch` to `catch (err)` with `toast.error(err.message \|\| "Failed to add handoff note — please try again")`. | P1 | 5m | `tasks/[cardId]/page.tsx` | ✅ Done |
| AI-030 | Fix `WorkOrderHeader.tsx` "Sign Off & Close" button — linked to `/work-orders/${id}/signature` (PIN re-auth page that generates an event ID) instead of `/work-orders/${id}/rts` (the actual RTS authorization page). Same bug as AI-026 (fixed for QCM review) but present in the WO detail header used on every work order. When `canClose` was true and the button was clickable, it routed to the wrong page entirely. Changed `/signature` → `/rts`. | P0 | 5m | `_components/WorkOrderHeader.tsx` | ✅ Done |

### Cycle 9 — 2026-02-28 (Regulatory Compliance — 2nd pass)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-025 | Fix `work-orders/[id]/release/page.tsx` — release form allows aircraft customer handback with zero verification that RTS was authorized. Under 14 CFR Part 145, an aircraft CANNOT be returned to a customer without a signed RTS record. Add `useQuery(api.returnToService.getCloseReadinessReport)` to the release page; show a red blocking card and disable the Release button when `!report.isAlreadySigned`. | P0 | 45m | `work-orders/[id]/release/page.tsx` | ✅ Done |
| AI-026 | Fix `compliance/qcm-review/page.tsx` `CloseReadinessPanel` — "Sign Off & Close" button links to `/work-orders/${selectedWoId}/signature` (the re-authentication page where you **get** an auth event) instead of `/work-orders/${selectedWoId}/rts` (the page where you **do** the actual RTS sign-off). Sending an IA to the signature page when they intend to complete RTS is a workflow error that wastes time and causes confusion. | P0 | 10m | `compliance/qcm-review/page.tsx` | ✅ Done |
| AI-027 | Fix `compliance/page.tsx` — groups aircraft into "Aircraft with Active Work Orders" vs "Other Fleet Aircraft" based on `openWorkOrderCount > 0`. Having an open work order is orthogonal to AD compliance status — a compliant aircraft can have an open WO, and a non-compliant one might not. Remove the open-WO grouping; show all fleet aircraft in a single list sorted by actual compliance status: non-compliant first, then due-soon, then pending review, then compliant. Rename section header to "Fleet AD Compliance Status". | P1 | 30m | `compliance/page.tsx` | ✅ Done |

### Cycle 8 — 2026-02-28 (Performance)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-022 | Eliminate duplicate Convex subscription in `WOStatusChart` — chart fires `api.workOrders.listWorkOrders` (200 items) independently, but the dashboard parent already holds all WO data via `getWorkOrdersWithScheduleRisk`. Add an optional `workOrders` prop; when supplied, skip the internal query. Pass `workOrdersWithRisk` from `dashboard/page.tsx`. Eliminates one redundant backend subscription on every dashboard load. | P1 | 30m | `dashboard/_components/WOStatusChart.tsx`, `dashboard/page.tsx` | ✅ Done |
| AI-023 | Replace O(6n) counts `useMemo` in `work-orders/page.tsx` — `counts` runs `filterWorkOrders` 6 separate times on the full WO array (once per tab). Replace with a single-pass counter loop: one iteration, 6 buckets incremented, same output. | P2 | 15m | `work-orders/page.tsx` | ✅ Done |
| AI-024 | Wire `TechUtilizationChart` to real data — chart renders 5 hardcoded fake techs/hours with a "Sample data" disclaimer. Wire to `api.timeClock.listTimeEntries` (this-week filter) + `api.technicians.list` to show actual hours logged per technician in the current ISO week. Add Skeleton loading state. Show "No time entries this week" empty state. | P1 | 1h | `dashboard/_components/TechUtilizationChart.tsx` | ✅ Done |

### Cycle 11 — 2026-02-28 (Parts Traceability — 3rd pass)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-031 | Fix `rotables/page.tsx` — "Condemn" quick-action button fires immediately with zero confirmation. Condemning an aircraft component is irreversible: it writes the part off as airworthy-unfit and removes it from service permanently. A $20k–$200k part should not be written off with a single accidental click. Replace with `AlertDialog` (shadcn/ui) confirmation: "Condemn P/N XXXXXXX S/N XXXXXXX? This action cannot be undone." with a red confirm button. | P0 | 20m | `parts/rotables/page.tsx` | ✅ Done |
| AI-032 | Fix `loaners/page.tsx` — "Loan Out" dialog uses a raw text `Input` for Customer ID — the clerk must type a Convex document ID (e.g. `jd7abc123...`) which is completely unusable. Replace with `useQuery(api.customers.listCustomers)` dropdown so the clerk selects by customer name. Add loading state and "No customers" empty state. | P1 | 30m | `parts/loaners/page.tsx` | ✅ Done |
| AI-033 | Fix `parts/page.tsx` — part inventory cards have `cursor-pointer` class but clicking does nothing (no detail page exists, no `onClick` handler). Added `PartDetailSheet` slide-in panel showing: P/N, S/N, name, condition, location, supplier, received date, life-limit hours/cycles remaining (with colour-coded warnings), shelf-life expiry (with EXPIRED badge), 8130-3 on-file indicator, inspection result/notes, quarantine reason, and reservation status. Wired `onClick={() => setDetailPart(part)}` to every card. | P1 | 45m | `parts/page.tsx` | ✅ Done |

### Cycle 12 — 2026-02-28 (UI/UX Quality — 2nd pass)

| ID | Description | Priority | Est | Files Affected | Status |
|----|-------------|----------|-----|----------------|--------|
| AI-034 | Fix `fleet/[tail]/logbook/page.tsx` Back button — routes to `/fleet` (fleet list) instead of `/fleet/${tailNumber}` (the aircraft detail page). A tech opens the logbook for N192AK, reads the records, hits Back, and lands on the fleet list instead of N192AK's detail tab. Navigation regression — user loses context. Change `to="/fleet"` → `to={\`/fleet/${encodeURIComponent(tailNumber)}\`}`. | P1 | 5m | `fleet/[tail]/logbook/page.tsx` | ✅ Done |
| AI-035 | Fix `fleet/[tail]/logbook/page.tsx` date range filter — uses raw HTML `<input type="date">` styled manually with `bg-background border border-border/60 rounded px-2 py-1 text-xs` instead of shadcn `Input` component. Raw date inputs have no dark-mode theming support — the text is invisible against dark backgrounds on many browsers. Replace both raw date inputs with shadcn `<Input type="date">` (same as used in reports/page.tsx). Also updated the "Clear" link from raw `<button>` to shadcn `<Button variant="ghost">`. | P1 | 10m | `fleet/[tail]/logbook/page.tsx` | ✅ Done |
| AI-036 | Fix `personnel/page.tsx` `ShiftEditor.handleSave()` — catch block contains `// Silently ignore — toast system can be added later`. That comment has been stale for months; `sonner` is installed and used throughout the app. When a shift save fails (network error, auth expiry, Convex down), the technician's Save button silently re-enables with no explanation. Add `import { toast } from "sonner"` to personnel page and replace the silent catch with `toast.error(err instanceof Error ? err.message : "Failed to save shift — please try again")`. | P1 | 10m | `personnel/page.tsx` | ✅ Done |
