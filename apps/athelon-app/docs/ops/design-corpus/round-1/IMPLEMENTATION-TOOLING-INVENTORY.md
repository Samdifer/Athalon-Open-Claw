# Implementation Tooling Inventory

This document bridges the round-1 design research to the concrete tools, components,
and patterns already available in the `apps/athelon-app/` codebase.

## 1. Current UI Primitive Inventory

### shadcn/ui Components (30 installed)

All live in [`src/shared/components/ui/`](/apps/athelon-app/src/shared/components/ui/).

| Component | File | Notes |
|---|---|---|
| Alert | `alert.tsx` | Default + destructive variants only |
| Alert Dialog | `alert-dialog.tsx` | Confirmation dialogs |
| Avatar | `avatar.tsx` | User avatars |
| Badge | `badge.tsx` | CVA variants, `asChild` support |
| Breadcrumb | `breadcrumb.tsx` | Navigation trail |
| Button | `button.tsx` | All variants (default, destructive, outline, secondary, ghost, link) |
| Card | `card.tsx` | Container with Header/Content/Footer |
| Checkbox | `checkbox.tsx` | Form checkbox |
| Collapsible | `collapsible.tsx` | Expand/collapse (Radix) |
| Command | `command.tsx` | Command palette (cmdk 1.1.1) |
| Dialog | `dialog.tsx` | Modal dialogs |
| Drawer | `drawer.tsx` | Bottom/side drawer (vaul 1.1.2) |
| Dropdown Menu | `dropdown-menu.tsx` | Contextual menus |
| Hover Card | `hover-card.tsx` | Hover preview |
| Input | `input.tsx` | Text inputs |
| Label | `label.tsx` | Form labels |
| Navigation Menu | `navigation-menu.tsx` | Nav menus |
| Popover | `popover.tsx` | Floating popovers |
| Progress | `progress.tsx` | Progress bar |
| Select | `select.tsx` | Select/combobox |
| Separator | `separator.tsx` | Divider line |
| Sheet | `sheet.tsx` | Slide-out side panel (4 sides) |
| Sidebar | `sidebar.tsx` | Full sidebar primitive |
| Skeleton | `skeleton.tsx` | Loading skeleton |
| Sonner | `sonner.tsx` | Toast notifications (sonner 2.0.7) |
| Switch | `switch.tsx` | Toggle switch |
| Table | `table.tsx` | Semantic HTML table primitive |
| Tabs | `tabs.tsx` | Tab groups |
| Textarea | `textarea.tsx` | Multi-line input |
| Tooltip | `tooltip.tsx` | Hover tooltips |

### shadcn/ui Components Not Installed

These are available via `pnpm dlx shadcn add <name>` but are not yet in the
codebase:

- `accordion` — expandable sections (Collapsible covers this manually)
- `calendar` / `date-picker` — date selection (no `react-day-picker` installed)
- `form` — react-hook-form adapter (react-hook-form is installed but the shadcn
  `Form` wrapper is not)
- `pagination` — page navigation controls
- `radio-group` — radio button groups
- `resizable` — resizable panel groups (`react-resizable-panels`)
- `scroll-area` — custom scrollbar (`.custom-scrollbar` CSS fills this gap)
- `context-menu` — right-click menus
- `menubar` — menu bar
- `toggle` / `toggle-group` — toggle buttons
- `chart` — shadcn's Recharts wrapper (Recharts is installed and used directly)

### Key UI Dependencies

| Package | Version | Purpose |
|---|---|---|
| `radix-ui` | ^1.4.3 | Radix primitives (monorepo package) |
| `cmdk` | ^1.1.1 | Command palette headless component |
| `vaul` | ^1.1.2 | Drawer (bottom sheet) primitive |
| `recharts` | ^3.7.0 | Charting (AreaChart, BarChart, LineChart, PieChart) |
| `react-hook-form` | ^7.71.2 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Zod integration for forms |
| `zod` | ^4.3.6 | Schema validation |
| `lucide-react` | ^0.575.0 | Icon library (~575 icons) |
| `class-variance-authority` | ^0.7.1 | CVA for component variants |
| `clsx` | ^2.1.1 | Conditional classnames |
| `tailwind-merge` | ^3.5.0 | Merge Tailwind classes |
| `next-themes` | ^0.4.6 | Dark/light mode provider |
| `@react-pdf/renderer` | ^4.3.2 | PDF generation |
| `html5-qrcode` | ^2.3.8 | QR code scanner |
| `jsbarcode` | ^3.12.3 | Barcode generation |
| `qrcode.react` | ^4.2.0 | QR code rendering |
| `workbox-window` | ^7.3.0 | PWA service worker |

### Libraries Not Installed

| Library | Purpose | Round-1 relevance |
|---|---|---|
| `@tanstack/react-table` | Headless sortable/filterable/paginated tables | Carbon-style dense data tables |
| `@tanstack/react-virtual` | Windowed/virtualized list rendering | Large list performance (500+ rows) |
| `react-resizable-panels` | Resizable side-by-side panels | Fluent-style workbench splits |
| `@dnd-kit` | Drag-and-drop toolkit | Kanban board upgrades, scheduling |
| `framer-motion` | Animation library | Transition polish (currently CSS-only) |
| `date-fns` or `dayjs` | Date utility library | Calendar/date picker support |
| `react-day-picker` | Date picker component | Required by shadcn calendar/date-picker |

## 2. Existing Pattern Reference Map

Each round-1 workflow pattern mapped to its closest existing implementation.

### Dense workbench with side-panel drill-in

**Existing reference:**
[`QuoteBuilderLayout.tsx`](/apps/athelon-app/src/shared/components/quote-workspace/QuoteBuilderLayout.tsx)

A 3-panel workbench using CSS grid (`gridTemplateColumns: "280px minmax(0,1fr) 280px"`)
with a collapsible right panel toggled by icon buttons. This is the closest existing
example of a non-modal workbench split. No external library required.

**Also relevant:**
[`BinDetailSheet.tsx`](/apps/athelon-app/app/(app)/parts/warehouse/_components/BinDetailSheet.tsx)

Table row click opens `<Sheet>` with `<Tabs>` for drill-down detail. This is a modal
overlay pattern rather than a side-by-side split.

### Exception-first queue

**Existing reference:**
[`AttentionQueue.tsx`](/apps/athelon-app/app/(app)/dashboard/_components/AttentionQueue.tsx)

Queries AOG work orders first, then open findings, then certificate expirations.
Each item has `severity: "critical" | "warning" | "info"` with `getSeverityStyles()`.
Currently used only on the dashboard.

### Readiness gate

**Existing references:**
- [`RtsChecklist.tsx`](/apps/athelon-app/app/(app)/work-orders/[id]/rts/_components/RtsChecklist.tsx) —
  `PreconditionStatus: "PASS" | "FAIL" | "PENDING"` type system with live pass/total
  counter, per-row failure messages, numbered rows with `font-mono`.
- [`CloseReadinessPanel.tsx`](/apps/athelon-app/src/shared/components/CloseReadinessPanel.tsx) —
  Live Convex query via `api.workOrders.getCloseReadiness`, blockers rendered as
  `XCircle` items, CTA disabled until all pass.

The `RtsChecklist` `Precondition` interface (`id`, `label`, `description`, `status`,
`failureMessage`) is general enough to reuse for any multi-step gate.

### Timeline / audit view

**Canonical reference:**
[`ActivityTimeline.tsx`](/apps/athelon-app/app/(app)/work-orders/[id]/_components/ActivityTimeline.tsx)

Vertical line (`absolute left-[11px] w-px bg-border`), icon nodes
(`w-[22px] h-[22px] rounded-full`), color-coded by `EVENT_CONFIG`, field change diff
display (From/To in bordered box), actor + formatted timestamp in
`font-mono text-[10px]`. `ring-2 ring-background` gives nodes a floating effect.

**Other timeline implementations:**
- [`WriteUpTimeline.tsx`](/apps/athelon-app/app/(app)/work-orders/[id]/_components/WriteUpTimeline.tsx) — append-only narrative
- [`InteractionTimeline.tsx`](/apps/athelon-app/app/(app)/crm/_components/InteractionTimeline.tsx) — CRM interactions
- [`PartHistoryTimeline.tsx`](/apps/athelon-app/app/(app)/parts/_components/PartHistoryTimeline.tsx) — parts provenance
- [`ComplianceTimeline.tsx`](/apps/athelon-app/app/(app)/compliance/_components/ComplianceTimeline.tsx)

All are pure CSS implementations requiring zero external libraries. The
`ActivityTimeline` pattern should be promoted to `src/shared/components/` as a
reusable design system component.

### Command-centric interaction

**Existing reference:**
[`CommandPalette.tsx`](/apps/athelon-app/src/shared/components/CommandPalette.tsx)

Full implementation with `Cmd/Ctrl+K` global hotkey, live Convex global search
(work orders, aircraft, task cards), navigation items, quick actions, and RBAC
filtering via `canRoleAccessPath`.

[`KeyboardShortcuts.tsx`](/apps/athelon-app/src/shared/components/KeyboardShortcuts.tsx) —
Vim-style two-key navigation sequences (`gw` → work orders, `gd` → dashboard,
`nw` → new WO) with `ShortcutsHelp` modal (`?` key).

**Gap:** The palette is global-only. Page-scoped contextual actions would require a
context provider pattern that pages can push actions into.

### Side-panel drill-in

**Existing reference:**
[`BinDetailSheet.tsx`](/apps/athelon-app/app/(app)/parts/warehouse/_components/BinDetailSheet.tsx)

The `<Sheet>` component supports 4 sides, default right width `sm:max-w-sm` (384px).
Override via `className="sm:max-w-[600px]"` for wider detail panels.

**Current usage:** Sheet is used in only 2 places (Parts warehouse, quote workspace).
Most detail views use full-page navigation. Expanding Sheet usage to more surfaces
would align with the round-1 "dense workbench + drill-in" recommendation.

## 3. Gap Analysis

### High-value additions

| Need | Solution | Effort |
|---|---|---|
| Sortable/filterable data tables | Install `@tanstack/react-table` v8, build `DataTable` component on existing `Table` primitive | Medium — zero breaking changes, pure headless layer |
| Date selection | Install `react-day-picker` + shadcn `calendar`/`date-picker` | Low — `react-hook-form` is already installed |
| Form component wrapper | Install shadcn `form` component | Low — wires `react-hook-form` + `zod` to `Label`/`Input` |
| Accordion sections | Install shadcn `accordion` | Low — alternative to manual `Collapsible` usage |
| Pagination controls | Install shadcn `pagination` | Low — needed for table pagination |

### Optional additions

| Need | Solution | Effort |
|---|---|---|
| Resizable panels | Install `react-resizable-panels` + shadcn `resizable` | Low — enhances QuoteBuilder pattern |
| Drag-and-drop | Install `@dnd-kit` | Medium — scheduling already has custom DnD |
| Virtualized lists | Install `@tanstack/react-virtual` | Low — only needed for 500+ row tables |
| Radio groups | Install shadcn `radio-group` | Low |
| Scroll area | Install shadcn `scroll-area` | Low — `.custom-scrollbar` CSS is the current fallback |

### Components to promote to shared

These exist as one-off implementations and should be extracted to
`src/shared/components/` for reuse across surfaces:

- `ActivityTimeline` — canonical timeline pattern
- `Precondition` type + readiness gate pattern from `RtsChecklist`
- `AttentionQueue` severity styling pattern
- View mode toggle (List/Tiles/Compact) — duplicated across Work Orders, Fleet, Parts

## 4. Design Token Snapshot

All tokens defined in
[`globals.css`](/apps/athelon-app/app/globals.css) using Tailwind v4
CSS-only configuration (`@theme inline`).

### Color system

OKLCH color space throughout. Dark mode is the primary experience.

**Aviation semantic tokens:**

| Token | Value (dark) | Usage |
|---|---|---|
| `--aviation-sky` | `oklch(0.68 0.195 214)` | Active/primary, same as `--primary` |
| `--aviation-success` | `oklch(0.72 0.22 148)` | Signed-off, RTS, airworthy |
| `--aviation-warning` | `oklch(0.762 0.184 76)` | Caution, deferred status |
| `--aviation-critical` | `oklch(0.63 0.24 27)` | AOG, critical findings |

**Status utility classes:**

| Class | Semantic |
|---|---|
| `.status-active` | Active/in-progress work |
| `.status-signed` | Signed off, complete |
| `.status-warning` | Caution, attention needed |
| `.status-critical` | Critical, AOG, blocked |
| `.status-muted` | Inactive, deferred |

**Additional utilities:**

- `.aog-indicator` — red left border for AOG items
- `.aog-pulse` — pulsing animation keyframe for critical alerts
- `.font-mono-pn` — monospace tabular-nums for part/serial numbers
- `.font-tactical` — Rajdhani tactical display font
- `.card-hover` — lift + shadow hover animation
- `.pattern-diagonal-lines` — subtle diagonal stripe background
- `.custom-scrollbar` — webkit scrollbar styling

### Typography stack

| Token | Font | Usage |
|---|---|---|
| `--font-sans` | Geist | Primary UI text |
| `--font-mono` | Geist Mono | Part numbers, tail numbers, timestamps, code |
| `.font-tactical` | Rajdhani 500/600/700 | Tactical callouts, display headers |

### Radius scale

Base `--radius: 0.5rem` with `sm/md/lg/xl/2xl/3xl/4xl` steps.

### Chart palette

5 tokens (`--chart-1` through `--chart-5`) mapping to sky blue, green, amber, purple,
red. Used by Recharts throughout dashboard, reports, CRM analytics, billing analytics,
scheduling analytics, and financial planning.

### Sidebar token set

Independent 8-token set for sidebar styling:
`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
`--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`,
`--sidebar-border`, `--sidebar-ring`.

## 5. Buildable Today vs. Needs New Dependencies

| Pattern | Buildable today | Needs library | Reference |
|---|---|---|---|
| Sheet drill-in panel | Yes | No | `sheet.tsx`, `BinDetailSheet` |
| Non-modal workbench split | Yes (CSS grid) | No | `QuoteBuilderLayout` |
| Resizable workbench panels | No | `react-resizable-panels` | Optional enhancement |
| Exception queue coloring | Yes | No | `AttentionQueue`, `globals.css` status classes |
| Alert with warning/info variants | Partial (className override) | No | Extend `alert.tsx` |
| Sortable/filterable data table | Partial (manual useState) | `@tanstack/react-table` for full solution | No breaking changes |
| Virtualized table rows | No | `@tanstack/react-virtual` | Only for 500+ row tables |
| Command palette | Yes — fully built | No | `CommandPalette` |
| Page-scoped command actions | Partial | No | Needs context provider extension |
| Readiness gate checklist | Yes | No | `RtsChecklist`, `CloseReadinessPanel` |
| Linear stepper/wizard | No component | No | Build from `Separator` + `Badge` + flex |
| Timeline/audit view | Yes | No | `ActivityTimeline` (canonical) |
| Collapsible rows / accordion | Yes | No | `Collapsible` works; `accordion` is optional |
| Toast notifications | Yes | No | Sonner 2.0.7 |
| Progress bar | Yes | No | `progress.tsx` |
| Date picker | No | `react-day-picker` | Required for shadcn calendar |
| Drag-and-drop | Scheduling only (custom) | `@dnd-kit` for general use | Medium effort |
