# Athelon Redesign - Next Steps Handoff

This document is the revised handoff for the next phase of the Athelon redesign.
It keeps the original incremental strategy, but expands it into a fuller program so
future sessions do not treat the redesign as a set of isolated page rewrites.

## Background (Read These First)

Before executing any tasks, read these documents and code files:

1. `apps/athelon-app/docs/ops/design-corpus/REDESIGN-ARCHITECTURE-PLAN.md`
   - Control-plane document for multi-agent execution, file ownership, and safety rules
2. `apps/athelon-app/docs/ops/design-corpus/WAVE-0-EXECUTION-MANIFEST.md`
   - Wave-specific assignment, write scope, and handoff rules
3. `apps/athelon-app/docs/ops/design-corpus/round-1/MASTER-SYNTHESIS.md`
   - Overall design direction: multi-mode family, not one averaged visual system
4. `apps/athelon-app/docs/ops/design-corpus/round-1/ARCHITECTURE-COUPLING-ANALYSIS.md`
   - UI/backend coupling and route-swap feasibility
5. `apps/athelon-app/docs/ops/design-corpus/round-1/IMPLEMENTATION-TOOLING-INVENTORY.md`
   - Existing UI primitives, dependencies, and missing building blocks
6. `apps/athelon-app/docs/ops/design-corpus/round-1/SURFACE-PATTERN-AUDIT.md`
   - Per-surface patterns, gaps, and recommended primitives
7. `apps/athelon-app/docs/ops/design-corpus/round-1/ROLE-AND-WORKFLOW-FIT-MATRIX.md`
   - Role-to-surface and mode-fit scoring
8. `apps/athelon-app/docs/ops/APP-HIERARCHY-AND-INTERCONNECTIVITY-MAP.md`
   - Reverse-engineered app boundary and domain interconnectivity map
9. `apps/athelon-app/docs/ops/APP-PAGE-INVENTORY.csv`
   - Exhaustive route and page inventory snapshot
10. `apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx`
   - Source of truth for route inventory and route depth
11. `apps/athelon-app/src/shared/lib/mro-access.ts`
   - Permission grants, route permission rules, role nav access
12. `apps/athelon-app/src/shared/lib/route-permissions.ts`
   - Runtime route guard role map
13. `apps/athelon-app/src/shared/components/AppSidebar.tsx`
   - Current navigation shell and surface grouping
14. `apps/athelon-app/docs/ops/design-corpus/role-access/WAVE-0-ROLE-ACCESS-DECISIONS.md`
   - Post-Wave-0 decision baseline for commercial ownership and visibility semantics
15. `apps/athelon-app/package.json`
   - Available validation and Playwright commands

Treat the round-1 docs as the source of truth for design direction and the code files
above as the source of truth for current route, access, and shell reality.

## Strategy Decision

**Mode-aware incremental surface-by-surface redesign**, not a parallel v2 app.

Rationale:

- The route structure is already declarative and lazy-loaded, so pages can be swapped
  one at a time with low infrastructure cost.
- The UI layer is tightly coupled to Convex and cannot be cleanly forked into a
  second app without duplicating a large amount of data wiring.
- The redesign is not only visual. Role access, shell behavior, and shared UX
  primitives all affect whether a surface is actually usable for its intended jobs.
- Old pages should remain in the tree as dormant reversion targets until the new
  surface has passed acceptance checks.

## Program Outcomes

This phase should leave the app with:

1. Surface registry documents for every major route family, not only the first 10.
2. A role/access model that matches the redesign thesis instead of contradicting it.
3. Typed domain hooks for the highest-risk surfaces and shell-adjacent data seams.
4. Shared components and UX primitives that support the round-1 recommendations.
5. Validation and rollout rules so route swaps happen safely.

## Workstreams

### Workstream A: Surface Registries and Journey Maps

**Goal:** Create one document per major surface that explains what the surface does,
who uses it, what data it depends on, what shell context it assumes, and how it
should evolve under the round-1 design modes.

**Output location:** `apps/athelon-app/docs/ops/design-corpus/feature-registry/`

**Surface coverage (priority order):**

Wave 0:

1. `work-orders.md`
2. `lead-workspace.md`
3. `my-work.md`
4. `scheduling.md`
5. `parts.md`
6. `compliance.md`

Wave 1:

7. `billing.md`
8. `crm.md`
9. `sales.md`
10. `fleet.md`
11. `dashboard.md`

Wave 2:

12. `findings.md`
13. `personnel.md`
14. `training.md`
15. `reports.md`
16. `settings.md`

**Required sections per document:**

```md
# [Surface Name] - Feature Registry

## Design Direction
Which round-1 mode(s) apply: ICW / ETF / CAH / CWP / PNU / mixed

## Roles and Access
- Which roles use this surface
- What jobs they do here
- What the current permission files and nav rules say today
- Any mismatch between intended users and actual access rules

## Entry Points and Adjacent Surfaces
- Where users arrive from
- Which sibling surfaces they commonly jump to next
- Whether the surface depends on global shell actions

## Routes
All routes with depth levels, listing the page component file for each

## Shell Dependencies
- Top bar assumptions
- Command palette / keyboard shortcuts
- Global timer / notifications / location switcher
- Breadcrumbs / secondary nav / tabs

## Data Dependencies
### Convex Queries
Every useQuery call with the api.* path and argument shape

### Convex Mutations
Every useMutation or useAction call with the api.* path

### Cross-Feature Data
Queries that reach into other domains

## Cross-Feature Component Imports
Any imports from another feature's _components/ directory

## Shared Component Usage
Components imported from src/shared/components/

## UI Patterns in Use
- List display
- Detail navigation
- Forms
- Status indicators
- Filters and URL persistence
- Loading / error / empty states

## State Model
- Local UI state
- URL search params
- Loading gates
- Edit and save flows

## Key Workflows by Role
Step-by-step description of what each role actually does here

## Critical Decisions and Safety Checks
Any signoff, release, approval, or destructive action moments

## Redesign Notes
What round-1 research says should change on this surface

## Surface Acceptance Criteria
What must be true before this surface can replace the current page
```

**How to build each registry:**

1. Start from `protectedAppRoutes.tsx`, `AppSidebar.tsx`, `mro-access.ts`, and
   `route-permissions.ts`.
2. Read the primary page file and all route-adjacent pages for that surface.
3. Trace `_components/` imports, shared component usage, and Convex function
   signatures.
4. Describe workflows in plain English, per role, with emphasis on purpose and risk.

**Minimum files to inspect for every registry:**

- `apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx`
- `apps/athelon-app/src/shared/components/AppSidebar.tsx`
- `apps/athelon-app/src/shared/lib/mro-access.ts`
- `apps/athelon-app/src/shared/lib/route-permissions.ts`

**Primary route/component anchors by surface:**

| Surface | Route anchors | Key files |
|---|---|---|
| Work Orders | `/work-orders`, `/work-orders/:id`, task/finding/RTS/release subroutes | `app/(app)/work-orders/**` |
| Lead Workspace | `/lead`, `/work-orders/lead`, `/work-orders/handoff` | `app/(app)/lead/**`, `app/(app)/work-orders/lead/**`, `app/(app)/work-orders/handoff/**` |
| My Work | `/my-work`, `/my-work/time` | `app/(app)/my-work/**` |
| Scheduling | `/scheduling`, `/scheduling/*` | `app/(app)/scheduling/**` |
| Parts | `/parts`, `/parts/*` | `app/(app)/parts/**` |
| Compliance | `/compliance`, `/compliance/*` | `app/(app)/compliance/**` |
| Billing | `/billing/*`, quote redirects | `app/(app)/billing/**` |
| CRM | `/crm/*` | `app/(app)/crm/**` |
| Sales | `/sales/*` | `app/(app)/sales/**`, `app/(app)/billing/quotes/**`, `app/(app)/crm/pipeline/**`, `app/(app)/crm/prospects/intelligence/**` |
| Fleet | `/fleet/*` | `app/(app)/fleet/**` |
| Dashboard | `/dashboard` | `app/(app)/dashboard/**` |
| Findings | `/findings` | `app/(app)/findings/**` |
| Personnel | `/personnel/*` | `app/(app)/personnel/**` |
| Training | `/training/*` | `app/(app)/training/**` |
| Reports | `/reports/*` | `app/(app)/reports/**` |
| Settings | `/settings/*` | `app/(app)/settings/**` |

### Workstream B: Role and Access Alignment

**Goal:** Align the actual role model, route guards, and navigation shell with the
redesign thesis before visual redesign begins on sales, CRM, lead, or role-specific
surfaces.

**Why this is required:** The round-1 research assumes role-specific modes, but the
current permission and nav model still contains mismatches that can make the right
surface inaccessible to the right user or expose the wrong shell structure.

**Output location:** `apps/athelon-app/docs/ops/design-corpus/role-access/`

**Required deliverables:**

1. `ROLE-SURFACE-ALIGNMENT.md`
   - Matrix of roles -> intended surfaces -> intended design mode
2. `ROLE-LANDING-AND-NAV-MAP.md`
   - Default landing pages, primary nav sections, and secondary nav expectations
3. `ACCESS-MISMATCH-LOG.md`
   - Current contradictions between research, permissions, and nav

**Required analysis:**

- Compare `ROLE_PERMISSION_GRANTS`, `ROUTE_PERMISSION_RULES`, `ROLE_NAV_ACCESS`,
  `ROUTE_PERMISSION_MAP`, and the actual `AppSidebar` groups.
- Resolve ownership of `/sales` and `/crm` for `sales_rep` and `sales_manager`.
- Define how `read_only` should experience dashboard, execution, billing, and
  reporting surfaces.
- Decide whether lead and handoff remain a distinct collaborative mode or stay folded
  into work-orders execution.
- Define which surfaces should be visible, visible-but-read-only, or hidden per role.

**If implementation is approved later, scope should be limited to:**

- `apps/athelon-app/src/shared/lib/mro-access.ts`
- `apps/athelon-app/src/shared/lib/route-permissions.ts`
- `apps/athelon-app/src/shared/components/AppSidebar.tsx`
- Route and access tests covering the affected paths

**Validation expectations:**

- Every role has an explicit allowed/denied route matrix.
- Default landing page exists for every active role.
- Sidebar visibility matches route access.
- There is no sales/CRM access path that depends on billing-only semantics by accident.

### Workstream C: Domain Contract Extraction

**Goal:** Create typed domain hooks that wrap raw Convex calls and give redesigned
surfaces a stable interface contract.

**Output location:** `apps/athelon-app/src/shared/hooks/domain/`

**Phase 1 hooks (required before Work Orders / My Work / Lead redesign):**

1. `useWorkOrderDetail(workOrderId: Id<"workOrders">)`
2. `useWorkOrderList(filters: WorkOrderFilters)`
3. `useMyWorkQueue(filters?: MyWorkFilters)`
4. `useLeadWorkspace(options?: LeadWorkspaceOptions)`

**Phase 2 hooks (required before Scheduling / Parts / Billing / CRM redesign):**

5. `usePartsInventory(filters: PartsFilters)`
6. `useScheduleBoard(options: ScheduleOptions)`
7. `useBillingInvoices(filters: InvoiceFilters)`
8. `useCrmDashboard()`

**Phase 3 hooks (create before redesigning the related surface):**

9. `useFleetAircraftDetail(...)`
10. `useDashboardOverview(...)`
11. `usePersonnelTimeManagement(...)`
12. `useTrainingOjtDashboard(...)`
13. `useSettingsUserDirectory(...)`
14. `useReportsSummary(...)`

**Implementation rules:**

- One hook per file.
- Hooks own Convex `useQuery` / `useMutation` / `useAction` calls internally.
- Hooks return typed contracts plus a single `isLoading` boolean.
- Hooks do not own rendering logic or local view state.
- After extraction, update the current page to consume the hook instead of inline
  Convex calls.
- If a shared component remains Convex-coupled after the page hook extraction, log it
  as a shell/shared seam rather than hiding it in a page-level hook.

**Validation by phase:**

- After each hook: `pnpm --dir apps/athelon-app typecheck`
- Work Orders / Lead / My Work: targeted Playwright on work-order lifecycle, RTS,
  time-clock, and lead turnover flows
- Scheduling: `pnpm --dir apps/athelon-app test:scheduling-helpers` plus scheduler
  Playwright flows
- Billing / CRM: targeted billing and CRM guard flows
- Before any route swap: route-level smoke pass

### Workstream D: Shared Pattern Promotion and Missing UX Primitives

**Goal:** Promote one-off patterns into shared components and add the missing
primitives explicitly called for by the pattern audit.

**Output location:** `apps/athelon-app/src/shared/components/`

**Promotions already identified:**

1. `ActivityTimeline`
2. `ReadinessGate`
3. `ViewModeToggle`
4. `SeverityList`

**Additional primitives required by the audit:**

5. `DataTable`
   - Built on the existing `Table` primitive
   - Requires `@tanstack/react-table`
6. `PaginationControls`
   - Use the available app shell patterns; shadcn pagination is acceptable
7. `useUrlFilters` or equivalent URL-backed filter-state helper
   - Needed for repeat operational work on filtered surfaces
8. `DetailSheetWorkbench`
   - Generic right-side drill-in pattern for dense workbench surfaces
9. `ReviewConfirmPanel` or equivalent preview-then-confirm pattern
   - For signoff, close, release, and other high-consequence actions

**Implementation rules:**

- Shared primitives should stay presentational unless they are explicitly shell-level.
- Prefer composition over feature-specific props.
- Reuse existing `Sheet`, `Tabs`, `Badge`, `Table`, and token utilities before adding
  new dependencies.
- Install only the dependencies justified by the tooling inventory and the pattern
  audit.

**Validation expectations:**

- Typecheck after each extraction
- Update at least one real consumer per primitive
- For shared layout primitives, run smoke coverage on the surfaces that adopt them

### Workstream E: Shell and Cross-Surface Contract Alignment

**Goal:** Define the shared shell contract so redesigned surfaces do not diverge in
top-bar behavior, command access, timer behavior, or role-specific overview context.

**Why this matters:** A surface-by-surface redesign can still fail if the shell
remains inconsistent. `TopBar`, `CommandPalette`, `GlobalTimerWidget`,
`LocationSwitcher`, notifications, offline state, and keyboard shortcuts all shape
the real user experience across every surface.

**Output location:** `apps/athelon-app/docs/ops/design-corpus/shell/`

**Required deliverables:**

1. `SHELL-CONTRACT.md`
   - Stable shell zones, global actions, and role-specific shell behavior
2. `GLOBAL-INTERACTION-MAP.md`
   - Command palette, shortcuts, timer, notifications, and location switching
3. `SURFACE-TO-SHELL-DEPENDENCIES.md`
   - Which surfaces assume which shell capabilities today

**Required analysis:**

- Inventory shared components that remain Convex-coupled and classify them as
  shell-owned, shared-domain-owned, or candidates for extraction.
- Define what changes by mode:
  - execution mode
  - office mode
  - commercial mode
- Define whether each mode needs distinct secondary nav or only distinct interior
  page composition.
- Define how role landing pages and top-level overviews differ by role.

**Implementation follow-up if approved later:**

- Extract shell-facing hooks where useful, such as notifications, global timer,
  location list, and global search data contracts.

### Workstream F: Validation, Acceptance, and Rollout Governance

**Goal:** Give every redesign wave explicit success criteria, test commands, route
swap rules, and rollback rules.

**Output location:** `apps/athelon-app/docs/ops/design-corpus/rollout/`

**Required deliverables:**

1. `REDESIGN-ACCEPTANCE-MATRIX.md`
   - Per surface and per role acceptance criteria
2. `REDESIGN-VALIDATION-COMMANDS.md`
   - Exact commands to run for each redesign wave
3. `ROUTE-SWAP-CHECKLIST.md`
   - Preconditions for changing the live route import
4. `ROLLBACK-AND-OBSERVABILITY.md`
   - Reversion steps and what to monitor after a swap

**Minimum validation standards:**

- `pnpm --dir apps/athelon-app typecheck`
- Relevant node-based helper tests when the surface touches scheduling or other
  script-backed logic
- Targeted Playwright coverage for the redesigned surface
- `pnpm --dir apps/athelon-app exec playwright test tests/e2e/smoke-all-routes.spec.ts --project=chromium-authenticated`
- Additional visual QA capture for large route swaps when layout changes materially

**Acceptance should be role-specific:**

- technician
- lead_technician
- qcm_inspector
- parts_clerk
- billing_manager
- sales_rep / sales_manager
- shop_manager
- read_only

## Execution Order

These workstreams should not all start at once. The role/access and shell contracts
must exist before page redesign starts, or the redesign will drift.

### Wave 0 - Alignment and registry foundation (parallel, read-only)

1. Workstream A:
   - `work-orders.md`
   - `lead-workspace.md`
   - `my-work.md`
   - `scheduling.md`
   - `parts.md`
   - `compliance.md`
2. Workstream B:
   - role and access alignment docs
3. Workstream E:
   - shell contract docs

**Recommended agent dispatch:**

```text
Agent 1: Workstream A - Work Orders + Lead registry docs
Agent 2: Workstream A - My Work + Scheduling registry docs
Agent 3: Workstream A - Parts + Compliance registry docs
Agent 4: Workstream B - role/access alignment and mismatch log
Agent 5: Workstream E - shell contract and global interaction map
```

### Wave 1 - Foundation code for execution surfaces

Only begin after Wave 0 documents are complete and reviewed.

1. Workstream C:
   - `useWorkOrderDetail`
   - `useWorkOrderList`
   - `useMyWorkQueue`
   - `useLeadWorkspace`
2. Workstream D:
   - `ActivityTimeline`
   - `ReadinessGate`
   - `ViewModeToggle`
   - `SeverityList`
   - URL-backed filter helper

**Recommended agent dispatch:**

```text
Agent 6: Workstream C - useWorkOrderDetail + useWorkOrderList
Agent 7: Workstream C - useMyWorkQueue + useLeadWorkspace
Agent 8: Workstream D - ActivityTimeline + ReadinessGate
Agent 9: Workstream D - ViewModeToggle + SeverityList + URL filter helper
```

### Wave 2 - Foundation code for mixed and office surfaces

1. Workstream A:
   - `billing.md`
   - `crm.md`
   - `sales.md`
   - `fleet.md`
   - `dashboard.md`
2. Workstream C:
   - `usePartsInventory`
   - `useScheduleBoard`
   - `useBillingInvoices`
   - `useCrmDashboard`
3. Workstream D:
   - `DataTable`
   - `PaginationControls`
   - `DetailSheetWorkbench`
   - `ReviewConfirmPanel`

**Recommended agent dispatch:**

```text
Agent 10: Workstream A - Billing + CRM registry docs
Agent 11: Workstream A - Sales + Fleet + Dashboard registry docs
Agent 12: Workstream C - usePartsInventory + useScheduleBoard
Agent 13: Workstream C - useBillingInvoices + useCrmDashboard
Agent 14: Workstream D - DataTable + PaginationControls + DetailSheet + ReviewConfirm
```

### Wave 3 - Remaining surfaces and rollout governance

1. Workstream A:
   - `findings.md`
   - `personnel.md`
   - `training.md`
   - `reports.md`
   - `settings.md`
2. Workstream C:
   - create phase-3 hooks only for the next surfaces selected for redesign
3. Workstream F:
   - acceptance, validation, route swap, rollback

**Recommended agent dispatch:**

```text
Agent 15: Workstream A - Findings + Personnel registry docs
Agent 16: Workstream A - Training + Reports + Settings registry docs
Agent 17: Workstream C - phase-3 hooks for the next redesign targets
Agent 18: Workstream F - validation commands, acceptance matrix, route swap checklist
```

## What Comes After These Workstreams

Only after Waves 0-2 are complete should the first surface redesign begin.

The first redesign target should remain **Work Orders**, but now the prerequisite set
is larger:

1. Work Orders, Lead, My Work, Scheduling, Parts, and Compliance registries exist
2. Role/access contradictions for technician, lead, qcm, and read-only are resolved
3. Shell contract is documented
4. `useWorkOrderDetail` and adjacent execution hooks exist
5. Shared execution primitives exist
6. Validation commands and acceptance criteria are defined

Then:

1. Build `page-v2.tsx` (or equivalent replacement component) for Work Orders
2. Consume the extracted domain hooks
3. Apply the ICW patterns plus document-centric review moments
4. Run targeted validation
5. Swap the route import only after the acceptance gate passes
6. Keep the old page as a dormant rollback target

Probable redesign order after Work Orders:

1. My Work / Lead Workspace
2. Scheduling
3. Parts
4. Compliance
5. Billing / CRM / Sales

## Files That Must Not Be Modified

- `convex/`
  - The backend is stable and shared; redesign work should not alter backend shape
- `apps/athelon-app/docs/ops/design-corpus/round-1/*`
  - Preserve round-1 research outputs as historical records
- `apps/athelon-app/src/shared/components/ui/*`
  - Leave shadcn primitives unchanged; add wrappers outside this directory
- Existing page files targeted for redesign should not be deleted
  - Keep them as dormant rollback targets after route swaps

## Files That May Change Only Under Explicit Workstream Scope

- `apps/athelon-app/src/shared/lib/mro-access.ts`
- `apps/athelon-app/src/shared/lib/route-permissions.ts`
- `apps/athelon-app/src/shared/components/AppSidebar.tsx`

These should change only under Workstream B and only when the role/access alignment
documents have made the target state explicit.
