# Surface Pattern Audit

This document maps the round-1 design research onto the actual state of every major
surface in `apps/athelon-app/`. It identifies which design patterns each surface
currently uses, where patterns are consistent or divergent, and which surfaces should
be prioritized for later rounds.

## 1. Surface Inventory

All pages live under [`app/(app)/`](/apps/athelon-app/app/(app)/). The app shell
uses a fixed sidebar + scrollable main area pattern defined in
[`layout.tsx`](/apps/athelon-app/app/(app)/layout.tsx).

| Surface | Route prefix | Route depth | Key components |
|---|---|---|---|
| Dashboard | `/dashboard` | L1 | Widget grid, KPI cards, charts, attention queue, command center |
| My Work | `/my-work` | L1–L2 | Personal task queue, time tracking |
| Work Orders | `/work-orders` | L1–L4 | List + kanban + lead workspace + detail (7 tabs) + task card detail + RTS |
| Fleet | `/fleet` | L1–L3 | List + calendar + aircraft detail (4 tabs) + maintenance programs |
| Scheduling | `/scheduling` | L1–L2 | Custom Gantt, bay allocation, floating panels, roster, capacity |
| Parts | `/parts` | L1–L2 | 4 view modes, receiving, requests, warehouse, tools, cores, shipping |
| Findings | `/findings` | L1 | Global cross-WO findings list |
| Compliance | `/compliance` | L1–L2 | Fleet stats, per-aircraft cards, audit trail, QCM review, readiness |
| Billing | `/billing` | L1–L3 | Invoices + customers + vendors + POs + quotes + AR + analytics |
| Sales | `/sales` | L1–L2 | Dashboard, ops, training (quotes shared with billing) |
| CRM | `/crm` | L1–L3 | Dashboard + accounts + pipeline + prospects + contacts + interactions |
| Personnel | `/personnel` | L1–L3 | Command tabs (roster/teams/roles/holidays/analysis) + training + career |
| Training | `/training` | L1–L3 | OJT dashboard, curriculum, jackets, roster |
| Reports | `/reports` | L1–L2 | Hub + financials + inventory + revenue + throughput |
| Settings | `/settings` | L1–L2 | Shop, users, notifications, locations, imports, integrations |

**Total routes:** 130+ defined in
[`protectedAppRoutes.tsx`](/apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx).

## 2. Current Pattern Usage Matrix

### List display pattern

| Surface | Card-row list | shadcn Table | Kanban board | View mode toggle |
|---|---|---|---|---|
| Work Orders | Yes (primary) | No | Yes (`/kanban`) | 3 modes (List/Tiles/Truncated) |
| Fleet | Yes (primary) | No | No | 3 modes (List/Tiles/Truncated) |
| Parts | Yes (most modes) | Yes (`InventoryMasterTab`) | Yes (`InventoryKanban`) | 4 modes (Master/Kanban/Tiles/Compact) |
| Billing Invoices | Yes (list) | Yes (line items in detail) | No | No |
| CRM Accounts | Yes (card list) | No | No | No |
| CRM Pipeline | No | Yes (list mode) | Yes (board mode) | 2 modes (Kanban/Table) |
| CRM Prospects | Yes | No | No | 3 modes (Tiles/List/Expanded) |
| Findings | Yes (card list) | No | No | No |
| Personnel | Yes (card list) | No | No | No |
| Reports | No | Yes (data tables) | No | No |
| Settings Users | Yes (card list) | No | No | No |

**Observation:** Card-row lists are the dominant pattern. The shadcn `<Table>`
primitive is used in only ~5 surfaces. No surface has a sortable/filterable data
table with column controls — this is the single largest pattern gap.

### Detail navigation pattern

| Surface | Full-page detail | Sheet/Drawer detail | Inline expand |
|---|---|---|---|
| Work Orders | Yes (WO → task card → finding) | No | No |
| Fleet | Yes (aircraft detail) | No | No |
| Parts | Mixed | Yes (`BinDetailSheet`) | No |
| Billing | Yes (invoice/PO detail) | No | No |
| CRM | Yes (account detail) | No | No |
| Scheduling | No (all-in-one canvas) | Floating panels | No |

**Observation:** Full-page navigation is the dominant detail pattern. Sheet-based
drill-in is used in only 2 places (Parts warehouse, quote workspace). The round-1
corpus recommends expanding Sheet usage for "dense workbench + drill-in" on execution
surfaces.

### Form pattern

All forms across the app follow the same structure:

- Wrapper: `<Card><CardContent>` or full-page div
- Fields: `<Label>` + `<Input>`/`<Textarea>`/`<Select>` stacked in
  `<div className="space-y-4">`
- Submit: `<Button>` with `isSubmitting` loading state using `Loader2` spinner
- Errors: inline string error state rendered in alert card or under field

This pattern is consistent and does not need round-2 attention unless the shadcn
`Form` wrapper (react-hook-form adapter) is adopted for validation improvements.

### Status indicator patterns

| Pattern | Usage |
|---|---|
| `<Badge variant="outline">` with inline color classes | Universal for status/type values |
| 15% opacity background + matching border | Consistent color pattern across all badges |
| `border-l-4 border-l-red-500` left accent | AOG items in Work Orders and Fleet |
| `<Progress>` bar (1px height, 64px wide) | Task completion in WO list rows |
| `<Skeleton>` layout-matching loading states | Used instead of generic spinners |
| `ActionableEmptyState` | Zero-data states with CTA |
| `MissingPrereqBanner` | Prerequisite warnings |

### Filter and search patterns

| Surface | Search input | Filter popover | Status tabs | URL-synced |
|---|---|---|---|---|
| Work Orders | Yes | Yes (priority, type, location) | Yes (6 status tabs) | No |
| Fleet | Yes | Yes (location) | Yes (schedule range) | No |
| Parts | Yes | Yes (tags, location) | Yes (6 status tabs) | No |
| Billing Invoices | Yes | No | Yes (6 status tabs) | No |
| CRM Prospects | Yes | Yes (tier, quality, review) | Yes (qualification tabs) | No |
| Findings | Yes | No | Yes (4 status tabs) | No |
| Scheduling | Yes (filter bar) | Yes (multi-filter) | No | Partial (`useSearchParams`) |

**Observation:** Filter state is local (`useState`) on almost every surface. Only
Scheduling partially uses `useSearchParams` for URL persistence. Filters reset on
navigation, which hurts repeat operational work.

## 3. Pattern Consistency Map

### Consistent patterns (use as-is)

- **Status badges** — the `<Badge variant="outline">` + 15% opacity background +
  matching border pattern is used universally and should be preserved.
- **Form structure** — `Label` + `Input` + `space-y-4` stacking is consistent and
  matches enterprise transactional floorplan expectations.
- **Empty states** — `ActionableEmptyState` is used throughout.
- **Back navigation** — detail pages use `<Link>` with `<ArrowLeft>` consistently.
- **Tab groups** — `<Tabs>` from shadcn are the standard for in-page section switching.

### Divergent patterns (need alignment decisions)

| Pattern | Divergence | Surfaces affected |
|---|---|---|
| List display | Card-row vs Table vs Kanban — no standard default | All list surfaces |
| Detail drill-in | Full-page (most) vs Sheet (Parts warehouse only) | All detail surfaces |
| View mode toggle | 3 modes (WO, Fleet) vs 4 modes (Parts) vs 2 modes (CRM Pipeline) | List surfaces |
| Data loading | `usePagePrereqs` hook (some) vs manual `if (data === undefined)` (others) | All surfaces |
| Filter persistence | Local useState (most) vs URL params (Scheduling only) | All filtered surfaces |
| Timeline rendering | 5 separate implementations with similar but not identical patterns | WO, CRM, Parts, Compliance |

## 4. Corpus-to-Surface Gap Map

How each round-1 recommendation maps to surfaces that would benefit most.

### Industrial control workbench (ICW) gaps

The round-1 corpus recommends ICW for execution-heavy surfaces: work orders, my work,
scheduling, parts, compliance.

| Current gap | Surfaces affected | What would change |
|---|---|---|
| No sortable dense data tables | Parts, Compliance, WO task lists | Add `@tanstack/react-table` DataTable component |
| No side-panel drill-in on WO or Scheduling | Work Orders, Scheduling | Expand Sheet usage for inline detail inspection |
| Exception-first queues only on dashboard | Parts (request queue), Compliance (review queue), Scheduling (backlog) | Extract and reuse AttentionQueue severity pattern |
| Filter state resets on navigation | All ICW surfaces | Sync filter state to URL params |
| Timeline components are not shared | WO, Compliance | Promote ActivityTimeline to shared component |

### Enterprise transactional floorplan (ETF) gaps

The round-1 corpus recommends ETF for office-heavy surfaces: dashboard, billing,
reports, settings, manager views.

| Current gap | Surfaces affected | What would change |
|---|---|---|
| Invoice/PO line items are the only true table surfaces | Billing, Reports | More surfaces should use structured tables for business data |
| No pagination controls | Reports, Billing (large datasets) | Add shadcn pagination component |
| Settings pages are simple but not role-structured | Settings | Consider role-based settings groups (Fiori floorplan pattern) |

### Commerce/admin hybrid (CAH) gaps

The round-1 corpus recommends CAH for sales and customer-facing surfaces: CRM, quoting,
billing summaries.

| Current gap | Surfaces affected | What would change |
|---|---|---|
| CRM Prospect Intelligence uses static data | CRM Prospects | Wire to Convex backend |
| CRM and Sales share no common commercial shell | CRM, Sales | Consider unified commercial navigation or visual treatment |
| Quote workspace is architecturally advanced but visually identical to execution | Billing Quotes | Lighter visual treatment per CAH direction |

### Document-centric review (cross-cutting)

| Current gap | Surfaces affected | What would change |
|---|---|---|
| Readiness gate is WO-specific | Compliance (audit readiness), Fleet (airworthiness) | Generalize Precondition type for reuse |
| No review summary before high-consequence actions | Any signoff/close/release flow | Add preview-then-confirm pattern (document-centric) |

## 5. Priority Surfaces for Round 2

Ranked by complexity, user impact, and alignment with round-1 directions.

### Tier 1 — Highest impact

**1. Work Orders** — ICW execution cockpit

- Most complex surface (7 tabs, 4 navigation levels, stage flow stepper)
- Most frequently used by the highest number of roles
- Strongest candidate for Sheet-based drill-in, dense data tables, and
  exception-first queue integration
- Round-1 direction: ICW spine + document-centric moments around signoff

**2. Scheduling** — ICW control surface

- Architecturally unique (custom Gantt, floating panels, keyboard shortcuts, undo)
- Already the most advanced surface in the app
- Needs refinement more than redesign — the ICW direction is already implicit
- Round-1 direction: ICW spine with scheduling board + detail plane pattern

### Tier 2 — High impact

**3. Parts** — ICW + ETF mixed

- Biggest table gap in the app (4 view modes but no sortable/filterable table)
- Mixed operator and clerk behavior requires dual-mode treatment
- Round-1 direction: ICW for operational use + ETF for inventory administration

**4. Compliance** — ICW + document-centric

- Trust and audit visibility are the primary concerns
- Exception-first queues and readiness gates are the highest-value patterns
- Round-1 direction: document-centric readiness gate + first-class audit view

### Tier 3 — Medium impact

**5. Billing** — ETF + CAH

- Most form-heavy surface area
- Invoice/PO detail pages are the strongest existing table usage
- Round-1 direction: ETF spine with CAH clarity for customer-facing summaries

**6. CRM** — CAH

- Lightest current implementation relative to its ambition
- Prospect Intelligence page needs Convex backend wiring
- Round-1 direction: CAH spine with CWP coordination patterns

### Tier 4 — Lower priority

**7. Dashboard** — ETF

- Already functional with widget grid, charts, and attention queue
- Round-1 direction: role-specific overview pages (not one universal dashboard)

**8. Reports / Settings** — ETF

- Predictability beats stylistic novelty on these surfaces
- Main need is structured data tables for reports
