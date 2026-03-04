# Athelon Scheduling, P&L & Capacity — Build Plan

> Canonical feature-spec pointer: this file is a contributing source. The authoritative feature specification registry is [`MASTER-BUILD-LIST.md`](MASTER-BUILD-LIST.md). Derived planning references are under [`docs/plans/`](docs/plans/).

## Source Reference
Adapting from the Freelance-Management-Active scheduler app:
- **Gantt Engine**: `src/lib/gantt-engine/` (1,432 lines) — cascade-scheduler, critical-path, dependency-types, earned-value, resource-leveling, wbs
- **Gantt UI**: `src/components/features/gantt-*.tsx` (1,828 lines) — view, sidebar, filter-bar, dependency-arrows, progress-bar, billing-lane, export, assignee-avatar
- **Capacity**: `src/components/features/capacity-heat-map.tsx` (248 lines)
- **Finance/P&L**: `src/routes/finance/` (3,306 lines) — forecast, profitability, dashboard, runway, recurring expenses, goals
- **Finance Components**: `src/components/finance/` (5,964 lines) — charts, variance, schedule-c, runway report
- **Planning Docs**: `.planning/gantt-features/` (5,428 lines) — 4 phases of Gantt features

## Aviation MRO Adaptation

The scheduler app targets freelancers. For Athelon MRO, we adapt:

| Scheduler Concept | Athelon MRO Concept |
|---|---|
| Project | Work Order |
| Task | Task Card |
| Subtask | Task Card Step |
| Assignee | Technician |
| Client | Customer / Aircraft Owner |
| Budget | WO Estimate / Quote |
| Revenue | Invoice revenue |
| Resource | Technician + Hangar Bay |
| Milestone | WO Status gate (inspection, RTS) |
| Dependency | Task card dependency (e.g., NDT before assembly) |

## Build Phases (6 Agent Teams)

### Agent 1: Gantt Engine (Pure TypeScript)
**Files to create**: `lib/scheduling-engine/`
- `cascade-scheduler.ts` — Auto-cascade WO/task card scheduling with FS/FF/SS/SF + lag/lead
- `critical-path.ts` — CPM forward/backward pass, total float, critical path identification
- `dependency-types.ts` — Type definitions for MRO scheduling
- `resource-leveling.ts` — Technician workload leveling across hangar bays
- `earned-value.ts` — EVM metrics adapted for MRO (BAC from quotes, AC from time entries, EV from task completion)
- `wbs.ts` — Work breakdown structure for WO → task card → step hierarchy

Adapt from: `Freelance-Management-Active/freelance-management/src/lib/gantt-engine/`

### Agent 2: Gantt UI — Interactive Visual Scheduler
**Files to create/replace**: `app/(app)/scheduling/` pages + `_components/`
- Replace current basic GanttBoard (628 lines) with full interactive Gantt:
  - Drag-to-reschedule WO bars
  - Dependency arrow rendering (all 4 types)
  - Critical path highlighting (red bars)
  - Progress bars on WO/task card bars
  - Zoom levels: day/week/month
  - Today marker line
  - AOG work orders highlighted red with pulse
  - Technician swim lanes
  - Hangar bay capacity rows
- Filter bar: by priority, status, aircraft type, technician, date range
- Sidebar: WO backlog drag-to-schedule
- Export dialog: PDF/PNG of Gantt view

Adapt from: `Freelance-Management-Active/freelance-management/src/components/features/gantt-*.tsx`

### Agent 3: Capacity Management Dashboard
**Files to create**: `app/(app)/scheduling/capacity/` (replace current 282-line stub)
- **Capacity Heat Map**: Weekly grid showing technician hours by day, color-coded (green/amber/red for under/at/over capacity)
- **Shop Capacity Overview**: Total available hours vs scheduled hours by week
- **Hangar Bay Utilization**: Visual bay assignment timeline
- **Technician Workload**: Per-tech hours breakdown, overtime detection
- **Bottleneck Detection**: Identify overloaded techs/bays blocking WO completion
- **What-If Planning**: Drag a WO to see capacity impact before committing

Adapt from: `capacity-heat-map.tsx` + Convex `capacity.ts` queries

### Agent 4: P&L Projection & Financial Dashboard
**Files to create**: `app/(app)/reports/financials/` (new route group)
- `page.tsx` — Financial Dashboard: revenue pipeline, monthly P&L summary, margin trends
- `forecast/page.tsx` — Cash Flow Forecast: 3/6/12-month projected revenue from scheduled WOs + quotes in pipeline
- `profitability/page.tsx` — WO Profitability Analysis: actual cost vs quoted price per WO, margin %, by customer/aircraft type
- `runway/page.tsx` — Business Runway: monthly burn rate, revenue projection, months of runway
- Components:
  - `_components/PLSummaryCards.tsx` — Revenue, COGS (parts + labor), Gross Margin, Net
  - `_components/RevenueChart.tsx` — Monthly revenue trend (recharts)
  - `_components/MarginChart.tsx` — Margin % trend line
  - `_components/WOProfitabilityTable.tsx` — Per-WO P&L breakdown
  - `_components/ForecastChart.tsx` — Forward-looking revenue from scheduled WOs
  - `_components/CashFlowChart.tsx` — Cash in/out projection

Adapt from: `routes/finance/ForecastPage.tsx`, `ProfitabilityPage.tsx`, `FinanceDashboardPage.tsx`

### Agent 5: Quote Builder & WO Cost Estimation
**Files to create/enhance**: `app/(app)/billing/quotes/`
- **Smart Quote Builder**: Auto-populate from inspection template (labor hours × rate + parts markup)
- **Labor Rate Calculator**: Apply pricing rules from customer profile + tech skill level
- **Parts Cost Estimation**: Pull from inventory or vendor catalog with markup
- **Quote-to-Schedule**: When quote approved, auto-create WO with scheduled dates based on capacity
- **Revision Tracking**: Side-by-side comparison of quote revisions
- **Margin Preview**: Show estimated margin before sending quote

### Agent 6: Routes, Navigation & Integration
**Files to update**: `App.tsx`, `components/AppSidebar.tsx`
- Add routes for all new pages under `/scheduling/` and `/reports/financials/`
- Update sidebar: Scheduling section (Gantt, Bays, Capacity), Reports section (Financial Dashboard, Forecast, Profitability, Runway)
- Wire scheduling engine to dashboard KPI cards (scheduled capacity %, on-time delivery rate)
- Add "Schedule" tab to WO detail page showing Gantt position + dependencies + critical path status

## Technical Rules
- **Stack**: Vite 6 + React 19 + React Router DOM 6 + Convex + shadcn/ui + Tailwind 4
- **Charts**: recharts (already installed)
- **No convex/ modifications** — use existing queries/mutations
- **TypeScript strict** — `npx tsc --noEmit` = 0 errors
- **Use existing hooks**: `useCurrentOrg()`, existing Convex queries
- **Style**: Follow STYLE-GUIDE.md — dark mode primary, Industrial/Utilitarian tone
- **Toasts**: sonner only
- **Routing**: react-router-dom (NOT next/link)
