# Athelon UX Fix Execution Plan — Multi-Wave Agentic Implementation

> Generated: 2026-03-12
> Source: UX-USABILITY-EVALUATION.md + all team/orchestrator/holistic review findings
> Strategy: 5 waves, dependency-ordered, with parallel agent teams per wave

---

## Execution Philosophy

- **Waves are sequential** — each wave depends on the prior wave completing
- **Teams within a wave are parallel** — independent agent teams run simultaneously
- **Quick wins first** — Wave 0 clears trivial fixes to reduce noise in subsequent waves
- **Schema before UI** — localStorage migrations design schemas first, then wire UI
- **Regulatory before cosmetic** — FAA compliance fixes take priority over UX polish
- **Complete before simplifying** — sub-page decomposition before monolith simplification

---

## Wave 0 — Quick Wins (No Dependencies, All Parallel)

**Goal:** Clear 7 trivial fixes that take <30 minutes each. Reduces the open issue count and builds momentum.

| Agent | Task | ID | Files Touched | Est. Time |
|---|---|---|---|---|
| QW-1 | Remove Demo Apps card from `/settings/shop` | P0-06 | `settings/shop/page.tsx` | 5 min |
| QW-2 | Fix inverted switch logic (`checked={!day.isOpen}` → `checked={day.isOpen}`) | P0-07 | `settings/station-config/_components/` | 5 min |
| QW-3 | Add `overflow-x-auto` to training page TabsList (NOT flex-wrap) | P0-09 | `personnel/training/page.tsx` | 5 min |
| QW-4 | Replace snake_case status values with `WO_STATUS_LABEL` lookups on WO Dashboard | P1-09 | `work-orders/dashboard/page.tsx` | 20 min |
| QW-5 | Remove duplicate sidebar entries (Prospect Intel + Sales Training in both Sales and CRM) | P1-17 | `src/shared/components/AppSidebar.tsx` | 10 min |
| QW-6 | Fix PIN input to `inputMode="numeric"` on signature page | Team 1 | `work-orders/[id]/signature/page.tsx` | 5 min |
| QW-7 | Add runway report disclaimer banner (labor/overhead excluded) | P0-05 | `reports/financials/runway/page.tsx` | 15 min |

**Wave 0 total: 7 agents, ~65 minutes of parallel work**

---

## Wave 1 — Critical Fixes (Depends on Wave 0)

**Goal:** Fix data integrity, compliance, and broken workflow issues. 4 parallel teams.

### Team 1A: localStorage → Convex Migration (P0-01, P0-08, voice notes)

**Scope:** Design schemas and migrate 3 data categories from localStorage to Convex.

| Step | Task | Files |
|---|---|---|
| 1 | Design `partsRequests` schema: `requestedBy`, `requestedAt`, `status` (pending/ordered/received/cancelled), `technicianId`, `workOrderId`, `taskCardId`, `partNumber`, `quantity`, `notes`, `organizationId` | `convex/schema.ts` |
| 2 | Create `convex/partsRequests.ts` with mutations: `createPartRequest`, `updatePartRequestStatus`, `listPartRequestsForWorkOrder`, `listPartRequestsForOrg` | `convex/partsRequests.ts` |
| 3 | Design `routingTemplates` schema: `name`, `description`, `steps[]`, `organizationId`, `createdBy`, `isActive` | `convex/schema.ts` |
| 4 | Create `convex/routingTemplates.ts` with mutations: `createTemplate`, `updateTemplate`, `listTemplates`, `deactivateTemplate`, `applyTemplateToWorkOrder` | `convex/routingTemplates.ts` |
| 5 | Wire WO Detail parts request UI to Convex (replace localStorage reads/writes) | `work-orders/[id]/_components/PartRequestDialog.tsx` |
| 6 | Wire routing templates page to Convex (replace localStorage) | `settings/routing-templates/page.tsx` + `_components/` |
| 7 | Implement `applyTemplateToWorkOrder` (currently stubbed as "coming soon") | `convex/routingTemplates.ts` + UI |

### Team 1B: Finding Dispositioning + RBAC (P0-04)

**Scope:** Add dispositioning controls to finding detail, RBAC-gated to QCM/manager/admin roles only.

| Step | Task | Files |
|---|---|---|
| 1 | Add `dispositionFinding` mutation to Convex (status: deferred/corrected/rejected/accepted) with role validation | `convex/discrepancies.ts` |
| 2 | Add `getDiscrepancy(discrepancyId)` query (replace client-side filter-all) | `convex/discrepancies.ts` |
| 3 | Update finding detail page: show dispositioning controls only for `qcm_inspector`, `shop_manager`, `admin` roles | `work-orders/[id]/findings/[discrepancyId]/page.tsx` |
| 4 | For technician role: show read-only finding with "QCM Inspector action required" label | Same file |
| 5 | Add severity filter to `/findings` page (Critical/Major/Minor) | `findings/page.tsx` |

### Team 1C: Navigation & Sidebar Fixes (P1-02, P1-04)

**Scope:** Fix sidebar to surface hidden pages and disambiguate confusing entries.

| Step | Task | Files |
|---|---|---|
| 1 | Add `Findings` entry to sidebar under Compliance & Quality section | `AppSidebar.tsx` |
| 2 | Rename "Lead Center" → "Lead Center (Overview)" and "Lead Workspace" → "Lead Workspace (WO-Focused)" or consolidate to single entry | `AppSidebar.tsx` |
| 3 | Add sidebar entries for hidden settings pages: Users, Notifications, Email Log | `AppSidebar.tsx` |
| 4 | Consolidate Prospect Intelligence sidebar to parent group: "Prospect Intelligence" with children "MRO Shops (Pt 145)" and "Air Operators (Pt 135)" | `AppSidebar.tsx` |
| 5 | Add `Scheduling > Bays` and `Scheduling > Capacity` to sidebar | `AppSidebar.tsx` |

### Team 1D: Regulatory Compliance Quick Fixes (P1-15, P1-16, P1-14)

**Scope:** Fix FAA compliance gaps that are low-effort but high-regulatory-risk.

| Step | Task | Files |
|---|---|---|
| 1 | Implement soft-delete for training records: add `archivedAt: v.optional(v.number())` to schema, update `removeTraining` → `archiveTraining` mutation, filter archived records from list queries | `convex/schema.ts`, `convex/training.ts` or equivalent |
| 2 | Fix "Archive" button toast message and label (currently hard-deletes but says "archived") | Training page component |
| 3 | Add `createdBy` and `createdAt` columns to 8130-3/EASA Form 1 certificate list | `work-orders/[id]/certificates/page.tsx` |
| 4 | Add delete confirmation AlertDialog to OJT curriculum section/task deletion | OJT curriculum editor component |
| 5 | Add AlertDialog confirmation to aircraft release action | `work-orders/[id]/release/page.tsx` |

**Wave 1 total: 4 parallel teams, ~20 tasks**

---

## Wave 2 — Major UX Improvements (Depends on Wave 1)

**Goal:** Implement the top-10 UX changes that affect daily workflows. 4 parallel teams.

### Team 2A: Training Page Redesign (P1-01)

**Scope:** Restructure the 11-tab training mega-page to 5 focused tabs.

| Step | Task |
|---|---|
| 1 | Audit current 11 tabs: identify which stay (Records, Compliance, Requirements, Sign-Off Queue, Run/Taxi Quals) vs. which move (OKR analytics, efficiency metrics, scheduling constraints) |
| 2 | Move analytics/KPI tabs content to a new `/personnel/training/analytics` sub-page or to Reports |
| 3 | Restructure remaining tabs to max 5, using `overflow-x-auto` as fallback |
| 4 | Fix career profile deep-link: change from `/personnel/training?techId=...&jacketId=...` to `/training/ojt/jackets/${id}` |
| 5 | Ensure all 4 training entry points cross-link coherently |

### Team 2B: WO Breadcrumbs + Positive Confirmation States (P1-03, P1-05)

**Scope:** Add breadcrumb navigation and completion signals to the WO section.

| Step | Task |
|---|---|
| 1 | Create a shared `<WOBreadcrumb>` component that renders: Work Orders / WO-{number} / {Page Name} |
| 2 | Add `<WOBreadcrumb>` to all pages under `/work-orders/[id]/*`: tasks/new, tasks/[cardId], findings/[id], records, rts, release, certificates, execution, signature |
| 3 | Add green "All checks passed — ready to sign off" banner to WO Detail when all task cards are complete |
| 4 | Add "All steps complete — sign off this work card" prompt to Task Card Detail |
| 5 | Add "Proceed to Sign-Off" CTA to RTS checklist when all items pass |
| 6 | Preserve scroll position when returning from "Raise Finding" action on task card |

### Team 2C: Vendor Services Wiring + Billing Fixes (P0-02)

**Scope:** Wire existing Convex backend to vendor services UI; fix billing gaps.

| Step | Task |
|---|---|
| 1 | Wire `/billing/vendors/[id]` Services tab to `listVendorServices`, `createVendorService`, `updateVendorService` (backend already exists) |
| 2 | Remove hardcoded `initialDemoServices` useState |
| 3 | Add pricing rule creation form to `/billing/pricing` (currently tells users to "use the API") |
| 4 | Add edit/delete actions to `/billing/tax-config` (currently read-only) |
| 5 | Add `usePagePrereqs` guards to financial report sub-pages (P1-08) |

### Team 2D: Onboarding Wizard (P1-12)

**Scope:** Implement multi-step first-run onboarding wizard.

| Step | Task |
|---|---|
| 1 | Create `FirstRunWizard` component (5 steps): Organization basics → FAA certificate number → Primary location → Invite team members → Capabilities checklist |
| 2 | Update `OnboardingGate` to show `FirstRunWizard` for users with no org |
| 3 | Keep existing `OnboardingPage` for `/settings/new-organization` (admin second-org path) |
| 4 | Add completion checklist to dashboard for incomplete setup (missing FAA cert, no locations, no staff) |
| 5 | Remove "Back to Settings" button that creates navigation loop for first-time users |

**Wave 2 total: 4 parallel teams, ~21 tasks**

---

## Wave 3 — Structural Improvements (Depends on Wave 2)

**Goal:** Tab reduction, CRM/Billing unification, training schema improvements. 3 parallel teams.

### Team 3A: WO Detail & CRM Tab Reduction (Top-10 #8)

**Scope:** Cap both high-tab pages at 5 tabs with proper consolidation.

| Step | Task |
|---|---|
| 1 | WO Detail: Merge "Evidence" tab content into "Compliance" tab as a sub-section |
| 2 | WO Detail: Move "Notes" (handoff) into a collapsible panel on the main view, not a tab |
| 3 | Verify WO Detail is now at 5 tabs: Tasks, Compliance, Parts, Cost, Documents |
| 4 | CRM Account: Merge "Work History" and "Quotes & Invoices" into single "Transactions" tab |
| 5 | CRM Account: Move "Documents" to inline section within "Overview" tab |
| 6 | Verify CRM Account is now at 5 tabs: Overview, Contacts, Aircraft, Transactions, Interactions |

### Team 3B: CRM/Billing Inline Edit (Top-10 #9)

**Scope:** Enable core customer field editing from CRM without routing to Billing.

| Step | Task |
|---|---|
| 1 | Add inline editing of customer name, type, phone, email on CRM Account Detail overview tab |
| 2 | Use existing `updateCustomer` mutation (no new mutation needed) |
| 3 | Remove "Edit in Billing" button from CRM account views |
| 4 | Pre-populate customer ID when "Create Quote" is triggered from CRM account detail |
| 5 | Add "View Billing Details" link (subtle, not a primary CTA) for billing-specific views |

### Team 3C: Training Schema + Infrastructure (P1-06, P1-14)

**Scope:** Add structured certification fields and fix training infrastructure.

| Step | Task |
|---|---|
| 1 | Add nullable `ampCertificateNumber`, `iaCertificateNumber`, `ampExpiry`, `iaExpiry` fields to technician schema |
| 2 | Update career profile page: show structured fields when populated, fall back to heuristic with "(inferred)" label |
| 3 | Add certificate number fields to technician edit form with "Incomplete Profile" badge when empty |
| 4 | Fix career profile jacket deep-links to correct paths |
| 5 | Add `listByTechnician` query optimization for individual training page |

**Wave 3 total: 3 parallel teams, ~16 tasks**

---

## Wave 4 — Polish & Integration (Depends on Wave 3)

**Goal:** Address remaining P2 items, settings consolidation, portal improvements, scheduling prep. 4 parallel teams.

### Team 4A: Scheduling Prep + Reports

**Scope:** Prepare scheduling for future decomposition; fix report discoverability.

| Step | Task |
|---|---|
| 1 | Extract shared sub-nav component for scheduling pages (currently copy-pasted across 6 pages) |
| 2 | Ensure Due-List, Roster, and Quote sub-pages are fully self-contained (prerequisite for future Gantt simplification) |
| 3 | Gate `/scheduling/seed-audit` behind admin-only RBAC |
| 4 | Add Revenue and Throughput pages to scheduling/reports sub-navigation |
| 5 | Add methodology disclaimers to financial forecast and runway pages |

### Team 4B: Customer Portal Improvements

**Scope:** Polish the highest-rated section with incremental improvements.

| Step | Task |
|---|---|
| 1 | Replace hardcoded `text-gray-*` with semantic color tokens for dark mode compatibility |
| 2 | Rename "Messages" to "Support Tickets" and add submission confirmation |
| 3 | Add status filter to quote list (surface "Pending Approval" prominently) |
| 4 | Add "No customer account linked" actionable guidance message |
| 5 | Add portal-specific 404 page (prevent showing internal app navigation) |

### Team 4C: Settings Consolidation

**Scope:** Merge duplicate surfaces and fix non-functional settings pages.

| Step | Task |
|---|---|
| 1 | Consolidate `/settings/locations` into `/settings/station-config` (Facilities tab) — remove duplicate location management |
| 2 | Fix `/settings/shop` branding section: either wire save actions or remove non-functional color pickers/logo upload |
| 3 | Fix `/settings/shop` operating hours: link to station-config scheduling tab or make editable inline |
| 4 | Fix `/settings/notifications` mutation: should be per-user, not org-wide |
| 5 | Extract `AVIATION_TIMEZONES` constant to shared `@/lib/timezones.ts` (duplicated in 5+ files) |

### Team 4D: Data Consistency & Display Fixes

**Scope:** Fix cross-page data inconsistencies flagged by the orchestrator.

| Step | Task |
|---|---|
| 1 | Standardize date/time display: use consistent local time formatting across all pages (fix UTC "Z" suffix on Shift Handoff) |
| 2 | Fix customer health score bucket mismatch (4 buckets in Analytics vs 3 in Accounts filter) |
| 3 | Standardize invoice status casing (ALL_CAPS on portal → sentence case to match internal) |
| 4 | Add "Work Order" as default entry type on `/my-work/time` clock-in |
| 5 | Add overdue count stat card to `/my-work` page |
| 6 | Fix fleet calendar "+N more" drill-down to navigate to filtered WO list for that day |

**Wave 4 total: 4 parallel teams, ~21 tasks**

---

## Execution Summary

| Wave | Teams | Tasks | Dependencies | Theme |
|---|---|---|---|---|
| 0 | 7 agents | 7 | None | Quick wins (5-30 min each) |
| 1 | 4 teams | ~20 | Wave 0 | Critical: data integrity, compliance, navigation |
| 2 | 4 teams | ~21 | Wave 1 | Major: UX improvements, onboarding, vendor wiring |
| 3 | 3 teams | ~16 | Wave 2 | Structural: tab reduction, CRM unification, schema |
| 4 | 4 teams | ~21 | Wave 3 | Polish: portal, settings, consistency, scheduling |
| **Total** | **22 team-slots** | **~85 tasks** | | |

## P0/P1 Coverage

| ID | Description | Wave | Team |
|---|---|---|---|
| P0-01 | Migrate parts requests to Convex | 1 | 1A |
| P0-02 | Wire vendor services to Convex | 2 | 2C |
| P0-03 | Add `getDiscrepancy` query | 1 | 1B |
| P0-04 | Finding dispositioning + RBAC | 1 | 1B |
| P0-05 | Runway report disclaimer | 0 | QW-7 |
| P0-06 | Remove Demo Apps card | 0 | QW-1 |
| P0-07 | Fix inverted switch logic | 0 | QW-2 |
| P0-08 | Migrate routing templates to Convex | 1 | 1A |
| P0-09 | Fix training tab overflow | 0 | QW-3 |
| P1-01 | Redesign training page | 2 | 2A |
| P1-02 | Add Findings to sidebar | 1 | 1C |
| P1-03 | WO breadcrumb navigation | 2 | 2B |
| P1-04 | Disambiguate Lead workspaces | 1 | 1C |
| P1-05 | Positive confirmation states | 2 | 2B |
| P1-06 | Structured A&P/IA fields | 3 | 3C |
| P1-07 | CRM inline customer editing | 3 | 3B |
| P1-08 | Financial report page guards | 2 | 2C |
| P1-09 | Human-readable WO status labels | 0 | QW-4 |
| P1-10 | Aircraft release confirmation | 1 | 1D |
| P1-11 | Offline stale data warning | 2 | 2B |
| P1-12 | Onboarding wizard | 2 | 2D |
| P1-13 | Scheduling decomposition prep | 4 | 4A |
| P1-14 | OJT delete confirmation | 1 | 1D |
| P1-15 | Training record soft-delete | 1 | 1D |
| P1-16 | Certificate audit fields | 1 | 1D |
| P1-17 | Remove duplicate sidebar entries | 0 | QW-5 |
| P1-18 | WO template edit/deactivate | 2 | 2C |

---

## Risk Mitigations

1. **Schema changes (Waves 1, 3):** All new Convex fields are nullable/optional. Existing records render gracefully with `undefined` values.
2. **Sidebar changes (Waves 0, 1):** All sidebar changes are additive or renamings — no routes are removed. Existing bookmarks continue to work.
3. **Tab reduction (Wave 3):** Content is merged/relocated, not deleted. Verify bidirectional WO↔Invoice traceability before merging CRM tabs.
4. **CRM/Billing unification (Wave 3):** Uses existing `updateCustomer` mutation only — no new mutation paths. Full canonical view unification deferred to future milestone.
5. **Training page restructure (Wave 2):** Career profile deep-link fix happens in same wave to avoid sequencing trap.
6. **Typecheck after each wave:** `pnpm typecheck` run after every wave completes to catch regressions early.
