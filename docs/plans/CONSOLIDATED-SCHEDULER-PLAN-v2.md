# Consolidated Scheduler & Planning Implementation Plan v2

**Date:** 2026-03-03  
**Status:** Active — incorporates Sam's product decisions from 2026-03-03  
**Supersedes:** All three prior plans (scheduler parity, quote parity, agent wave execution)

---

## Executive Summary

Athelon's scheduling system targets small-to-mid Part 145 shops (1–30 concurrent WOs) currently running on Excel and whiteboards. The goal is **5 minutes from first login to first scheduled work order**.

Sam's answers crystallize the product into a **two-Gantt architecture**: a shop-level Gantt (WO → bay assignment) and a WO-level Gantt (tech → task execution). Nearly all work flows through quotes, making the embedded quote builder high priority. The financial P&L panel is a must-keep. Multi-location support is required from day one. Touch/mobile is paramount, not optional.

Key new features not in original plans: **carry-forward work orders** (deferred maintenance items persist across aircraft visits), **training-based assignment validation** (not A&P/IA ratings), **undo + keyboard shortcuts**, **AD-to-WO task integration**, and a **lost-quote graveyard with retry workflow**.

The current codebase is ~80% complete on core scheduling interactions. The real remaining work is: quote parity (XL), WO-level tech-to-task Gantt (XL), carry-forward system (L), training-based constraints (M), mobile/touch (L), and hardening (L).

---

## Architecture Decisions

### 1. Two-Gantt Architecture
| Gantt | Scope | Lanes | Items | Primary User |
|-------|-------|-------|-------|-------------|
| **Shop Scheduler** | Cross-shop planning | Hangar bays | Work orders | Shop scheduler / lead |
| **WO Execution** | Single WO execution | Technicians | Task cards / steps | WO lead / foreman |

These are separate pages/views. The Shop Scheduler lives at `/scheduling`. The WO Execution Gantt lives at `/work-orders/[id]/execution` (new route).

### 2. Carry-Forward Work Order System
When a WO closes, deferred maintenance items and notes are captured as `carryForwardItems` linked to the aircraft. These surface:
- In the **fleet/aircraft detail** area as pending deferred items
- When creating a **new quote** for the same aircraft (auto-suggested line items)
- When opening a **new WO** for the same aircraft (pre-populated tasks)

New Convex table: `carryForwardItems` with fields: `aircraftId`, `organizationId`, `sourceWorkOrderId`, `description`, `category` (deferred_maintenance | note | ad_tracking), `priority`, `createdAt`, `consumedByQuoteId?`, `consumedByWorkOrderId?`, `status` (open | consumed | dismissed).

### 3. Training-Based Constraints (Not Rating-Based)
Tech assignment validation uses a `technicianTraining` table, not A&P/IA fields. Training types:
- **91.411** — Altimeter/static system inspection
- **91.413** — Transponder inspection  
- **Borescope** — Borescope inspection certified
- **NDT** — Non-destructive testing
- **Custom** — Organization-defined in-house training

Task cards can specify `requiredTraining: string[]`. The scheduler and WO execution Gantt validate assignments against technician training records.

### 4. Load-Leveling Magic Scheduler
The magic scheduler is a **load-leveling engine**, not bin-packing:
1. Sort WOs by selected priority weighting
2. Query real technician schedules (shift patterns from `capacity.ts`)
3. Apply efficiency multipliers per tech
4. Distribute WOs across bays to level daily labor-hour load
5. Respect training constraints for task-level assignments

### 5. Multi-Location from Day One
All queries and mutations remain scoped by `shopLocationId`. Cross-location features (WO transfer, shared tech pools) are deferred to v2 but the data model supports them.

### 6. Single Mutation Surface
All scheduling writes go through `convex/schedulerPlanning.ts`. The older `convex/scheduling.ts` mutations (`updateWOSchedule`, `assignWOToBay`, `getScheduledWOs`) are deprecated and will be removed in Wave 7.

### 7. Feature Flags
Stored in Convex `featureFlags` table, keyed by `(organizationId, flagName)`. Naming: `scheduler.wave{N}.{feature}`. Server-side checked in mutations, client-side for UI gating.

### 8. Audit Trail
Every scheduling mutation writes to the existing `auditLog` table. Fields: `entityType: "schedule_assignment"`, `action`, `userId`, `before/after JSON`, `timestamp`. Required for Part 145 compliance.

---

## Wave Plan (Re-Prioritized)

Waves re-ordered to achieve the **5-minute-to-first-WO** target. Onboarding + core drag-drop come first.

---

### Wave 1: Onboarding + Core Board (P0) — Complexity: L — Est: 40 agent-hours

**Goal:** First-run user creates bays, imports aircraft, and schedules their first WO in under 5 minutes.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 1.1 | Guided onboarding flow (create location → bays → first aircraft → first WO) | Frontend | `app/(app)/scheduling/_components/SchedulingOnboardingPanel.tsx` | ✅ Shell exists, needs guided steps |
| 1.2 | Sample data generation (demo bays + WOs) | Backend | `convex/onboarding.ts` (new) | ❌ New |
| 1.3 | Backlog → bay drag-drop | Frontend | `BacklogSidebar.tsx`, `GanttBoard.tsx` | ✅ Done |
| 1.4 | Cross-bay vertical move | Frontend | `GanttBoard.tsx` | ✅ Done |
| 1.5 | Horizontal date resize | Frontend | `GanttBoard.tsx` | ✅ Done |
| 1.6 | Bay row reorder | Frontend + Backend | `GanttBoard.tsx`, `convex/hangarBays.ts` | ✅ Done |
| 1.7 | Drop-zone visual feedback | Frontend | `GanttBoard.tsx` | ✅ Done |
| 1.8 | **Touch/pointer events for all DnD** | Frontend | `GanttBoard.tsx`, `BacklogSidebar.tsx` | ❌ New — replace mouse-only with pointer events |
| 1.9 | **Undo stack (last 5 ops) + Ctrl+Z / ⌘Z** | Frontend | `app/(app)/scheduling/page.tsx` → new `useScheduleUndo.ts` hook | ❌ New |
| 1.10 | **Keyboard shortcuts (F11 fullscreen, Ctrl+Z undo, Esc exit modes, arrow nav)** | Frontend | `app/(app)/scheduling/hooks/useSchedulerKeyboard.ts` (new) | ❌ New |
| 1.11 | Audit log on every schedule mutation | Backend | `convex/schedulerPlanning.ts` | ❌ New |

**New Convex mutations/queries:**
- `convex/onboarding.ts`: `generateSampleData` mutation (creates demo bays, aircraft, WOs for org)
- `convex/schedulerPlanning.ts`: Add `auditLog.insert()` to `upsertScheduleAssignment`, `archiveScheduleAssignment`, `restoreScheduleAssignment`

**Frontend components (new/modified):**
- Modified: `SchedulingOnboardingPanel.tsx` — add step-by-step wizard with progress
- Modified: `GanttBoard.tsx` — replace `onMouse*` with `onPointer*` events
- Modified: `BacklogSidebar.tsx` — add touch drag support
- New: `app/(app)/scheduling/hooks/useScheduleUndo.ts`
- New: `app/(app)/scheduling/hooks/useSchedulerKeyboard.ts`

**Feature flags:** `scheduler.wave1.onboardingWizard`, `scheduler.wave1.undoStack`, `scheduler.wave1.touchDnD`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/scheduling-onboarding.spec.ts
npx playwright test e2e/scheduling-dnd.spec.ts
# Manual: test on iPad Safari + Android Chrome
```

**Rollback:** Feature flags disable onboarding wizard and undo. Core DnD is already shipped. Touch events are additive (pointer events are a superset of mouse events).

**Dependencies:** None — this is the entry point.

---

### Wave 2: Fullscreen + Panels + P&L (P0) — Complexity: M — Est: 24 agent-hours

**Goal:** Full scheduling command center with financial visibility. P&L panel is a must-keep per Sam.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 2.1 | Fullscreen enter/exit | Frontend | `page.tsx` | ✅ Done |
| 2.2 | Analytics panel | Frontend | `SchedulingAnalyticsPanel.tsx` | ✅ Done |
| 2.3 | Roster panel | Frontend | `SchedulingRosterPanel.tsx` | ✅ Done |
| 2.4 | Financial tracker (P&L) | Frontend | `DailyFinancialTracker.tsx` | ✅ Done |
| 2.5 | Capacity forecaster | Frontend | `CapacityForecaster.tsx` | ✅ Done |
| 2.6 | **Fullscreen toolbar (all actions accessible)** | Frontend | `page.tsx` | ❌ Fullscreen hides sub-nav |
| 2.7 | **Panel state persistence (localStorage)** | Frontend | `page.tsx` | ❌ Panels reset on refresh |
| 2.8 | **Responsive panel layout for tablet** | Frontend | `page.tsx` | ❌ New |

**New Convex mutations/queries:** None — all data already available.

**Frontend components (modified):**
- `page.tsx` — add fullscreen toolbar, localStorage panel state, responsive breakpoints
- `DraggableWindow.tsx` — touch resize/drag support

**Feature flags:** `scheduler.wave2.fullscreenToolbar`

**Test gate:**
```bash
npx playwright test e2e/scheduling-fullscreen.spec.ts
# Manual: verify P&L panel on iPad landscape
```

**Rollback:** Feature flag disables fullscreen toolbar. All panels already ship.

**Dependencies:** Wave 1 (touch events)

---

### Wave 3: Edit Mode + Magic Scheduler + Training Constraints (P0) — Complexity: L — Est: 48 agent-hours

**Goal:** Load-leveling magic scheduler with training-based tech validation.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 3.1 | Edit mode toggle + banner | Frontend | `GanttBoard.tsx`, `page.tsx` | ✅ Done |
| 3.2 | Distribute tool | Frontend + Backend | `GanttBoard.tsx`, `schedulerPlanning.ts` | ✅ Done |
| 3.3 | Block day toggle | Frontend + Backend | `GanttBoard.tsx`, `schedulerPlanning.ts` | ✅ Done |
| 3.4 | Board-native magic selection | Frontend | `GanttBoard.tsx`, `BacklogSidebar.tsx` | ✅ Done |
| 3.5 | Magic scheduler dialog | Frontend | `page.tsx` | ✅ Done |
| 3.6 | **Training-based assignment validation** | Backend | `convex/technicianTraining.ts` (new), `convex/schedulerPlanning.ts` | ❌ New |
| 3.7 | **Magic scheduler: load-leveling algorithm** | Backend | `lib/scheduling/magicSchedule.ts` | ❌ Upgrade — add real capacity × efficiency |
| 3.8 | **Magic scheduler: conflict prevention** | Frontend + Backend | `page.tsx`, `schedulerPlanning.ts` | ❌ New |
| 3.9 | **Technician training CRUD UI** | Frontend | `app/(app)/personnel/[id]/training/page.tsx` (new) | ❌ New |
| 3.10 | **Task card: required training field** | Backend | `convex/schema.ts` → `taskCards` table | ❌ Schema addition |

**New Convex mutations/queries:**
- `convex/technicianTraining.ts` (new):
  - `listByTechnician(technicianId)` → query
  - `addTraining(technicianId, type, completedAt, expiresAt?)` → mutation
  - `removeTraining(trainingId)` → mutation
- `convex/schedulerPlanning.ts`:
  - `validateTechAssignment(technicianId, taskCardId)` → helper (checks training match)
- `convex/schema.ts`:
  - New table: `technicianTraining { technicianId, organizationId, trainingType, completedAt, expiresAt?, certificateRef? }`
  - Add to `taskCards`: `requiredTraining: v.optional(v.array(v.string()))`

**Frontend components:**
- New: `app/(app)/personnel/[id]/training/page.tsx` — training record CRUD
- Modified: `lib/scheduling/magicSchedule.ts` — implement load-leveling with capacity.ts data
- Modified: `page.tsx` — conflict blocking on magic scheduler apply

**Feature flags:** `scheduler.wave3.trainingValidation`, `scheduler.wave3.loadLeveling`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/scheduling-magic.spec.ts
# Unit: magicSchedule produces level load across bays
# Unit: assignment rejected when tech lacks required training
```

**Rollback:** Feature flags. Training validation is additive (soft warning first, hard block after confirmation).

**Dependencies:** Wave 1

---

### Wave 4: Quote System Parity + Embedded Quote Builder (P0) — Complexity: XL — Est: 72 agent-hours

**Goal:** Full quote builder parity. Embedded quote workspace in scheduling. Nearly all work comes through quotes — this is critical path.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 4.1 | `sortOrder` on `quoteLineItems` | Backend | `convex/schema.ts`, `convex/quotes.ts` | ❌ New |
| 4.2 | Line economics fields (`directCost`, `markupMultiplier`, `fixedPriceOverride`, `pricingMode`) | Backend | `convex/schema.ts`, `convex/quotes.ts` | ❌ New |
| 4.3 | Drag-reorder line items | Frontend | `app/(app)/billing/quotes/[id]/page.tsx` | ❌ New |
| 4.4 | Expanded line editor (cost, markup, override) | Frontend | `app/(app)/billing/quotes/[id]/page.tsx` | ❌ New |
| 4.5 | Quote-level profitability panel | Frontend | `app/(app)/billing/quotes/[id]/page.tsx` | ❌ New |
| 4.6 | AOG + requested start/end on quotes | Frontend + Backend | Schema + quote pages | ❌ New |
| 4.7 | Quote template manager | Frontend + Backend | `app/(app)/billing/quotes/templates/page.tsx` (new), `convex/quoteTemplates.ts` (new) | ❌ New |
| 4.8 | **Scheduler-embedded quote workspace (inline edit/save)** | Frontend | `SchedulingQuoteWorkspaceDialog.tsx` | ❌ Currently read-only shell |
| 4.9 | **Auto-suggest carry-forward items when quoting same aircraft** | Frontend + Backend | Quote composer + `convex/carryForwardItems.ts` | ❌ New (see Wave 5) |
| 4.10 | Backfill migration for existing quotes | Backend | Migration script | ❌ New |
| 4.11 | Recompute totals with override-safe logic | Backend | `convex/quotes.ts` | ❌ New |

**New Convex mutations/queries:**
- `convex/quotes.ts`:
  - `reorderLineItems(quoteId, orderedIds[])` → mutation
  - `updateLineEconomics(lineItemId, directCost?, markupMultiplier?, fixedPriceOverride?, pricingMode?)` → mutation
  - `recomputeQuoteTotals(quoteId)` → internal helper
- `convex/quoteTemplates.ts` (new):
  - `list(organizationId, aircraftFilter?)` → query
  - `create(...)` → mutation
  - `update(...)` → mutation
  - `duplicate(templateId)` → mutation
  - `toggleActive(templateId)` → mutation
  - `insertIntoQuote(quoteId, templateId)` → mutation
- `convex/schema.ts`:
  - Add to `quoteLineItems`: `sortOrder`, `directCost`, `markupMultiplier`, `fixedPriceOverride`, `pricingMode`
  - New table: `quoteTemplates { organizationId, name, aircraftTypeFilter?, lineItems[], isActive, createdAt }`

**Frontend components:**
- Modified: `app/(app)/billing/quotes/[id]/page.tsx` — drag reorder, economics editor, profitability panel
- Modified: `SchedulingQuoteWorkspaceDialog.tsx` — inline edit mode (not just read-only)
- New: `app/(app)/billing/quotes/templates/page.tsx` — template manager

**Feature flags:** `scheduler.wave4.quoteEconomics`, `scheduler.wave4.quoteTemplates`, `scheduler.wave4.embeddedQuoteEdit`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/quote-parity.spec.ts
# Test: line reorder persists, economics calculate correctly, template insertion works
# Test: embedded quote edit from scheduler saves to quote domain
```

**Rollback:** Backfill migration is backward-compatible (all new fields optional with defaults). Feature flags gate UI. Old quote flow continues to work.

**Dependencies:** Wave 1 (touch DnD for line reorder)

---

### Wave 5: Carry-Forward WOs + Graveyard + AD Integration (P1) — Complexity: L — Est: 40 agent-hours

**Goal:** Deferred maintenance carry-forward, lost-quote graveyard for learning/retry, and AD tracking through WOs.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 5.1 | **Carry-forward items table + mutations** | Backend | `convex/carryForwardItems.ts` (new) | ❌ New |
| 5.2 | **Capture deferred items on WO close** | Frontend + Backend | WO close flow + `convex/workOrders.ts` | ❌ New |
| 5.3 | **Fleet/aircraft detail: show pending carry-forward items** | Frontend | `app/(app)/fleet/[id]/page.tsx` | ❌ New section |
| 5.4 | **Auto-suggest carry-forward items in quote composer** | Frontend | Quote new/edit pages | ❌ New |
| 5.5 | **Lost-quote graveyard** | Frontend | `GraveyardSidebar.tsx` (extend for quotes) | ✅ Partial — WO archive exists |
| 5.6 | **Graveyard: retry workflow (clone declined quote)** | Frontend + Backend | `GraveyardSidebar.tsx`, `convex/quotes.ts` | ❌ New |
| 5.7 | **AD tracking: add ADs as WO tasks** | Frontend + Backend | WO task card UI + `convex/taskCards.ts` | ❌ New |
| 5.8 | **AD tracking: completion tracking through sign-offs** | Backend | `convex/taskCardSteps.ts` | ❌ New |
| 5.9 | Graveyard permanent delete with 2-step confirm | Frontend + Backend | `GraveyardSidebar.tsx`, `schedulerPlanning.ts` | ❌ Missing |
| 5.10 | Archive/restore (WOs) | Frontend + Backend | `GraveyardSidebar.tsx`, `schedulerPlanning.ts` | ✅ Done |

**New Convex mutations/queries:**
- `convex/carryForwardItems.ts` (new):
  - `listByAircraft(aircraftId)` → query (status: open)
  - `createFromWOClose(workOrderId, items[])` → mutation
  - `consumeByQuote(itemId, quoteId)` → mutation
  - `consumeByWO(itemId, workOrderId)` → mutation
  - `dismiss(itemId, reason)` → mutation
- `convex/quotes.ts`:
  - `cloneDeclinedQuote(quoteId)` → mutation (creates new DRAFT from DECLINED)
- `convex/taskCards.ts`:
  - `createFromAD(workOrderId, adReference, description, requiredTraining?)` → mutation
- `convex/schema.ts`:
  - New table: `carryForwardItems { aircraftId, organizationId, sourceWorkOrderId, description, category, priority, status, createdAt, consumedByQuoteId?, consumedByWorkOrderId?, dismissedReason? }`

**Frontend components:**
- New: Fleet aircraft detail section showing carry-forward items
- Modified: Quote composer — suggest carry-forward items for selected aircraft
- Modified: `GraveyardSidebar.tsx` — add quote graveyard tab with retry button
- Modified: WO close flow — prompt for deferred maintenance capture
- Modified: WO task card UI — "Add AD" button with AD reference field

**Feature flags:** `scheduler.wave5.carryForward`, `scheduler.wave5.quoteGraveyard`, `scheduler.wave5.adTracking`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/carry-forward.spec.ts
npx playwright test e2e/graveyard.spec.ts
# Test: close WO → capture deferred items → new quote for same aircraft shows suggestions
# Test: decline quote → appears in graveyard → retry creates new draft
# Test: add AD as task → complete steps → sign-off tracks completion
```

**Rollback:** Feature flags. Carry-forward is additive (new table, no existing data modified). Quote clone is a new mutation path.

**Dependencies:** Wave 4 (quote system for carry-forward suggestions and graveyard)

---

### Wave 6: WO-Level Tech-to-Task Execution Gantt (P1) — Complexity: XL — Est: 64 agent-hours

**Goal:** Separate Gantt view inside a work order for assigning technicians to task cards with time blocks.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 6.1 | **WO Execution Gantt component** | Frontend | `app/(app)/work-orders/[id]/_components/WOExecutionGantt.tsx` (new) | ❌ New |
| 6.2 | **Tech-to-task assignment data model** | Backend | `convex/schema.ts` → new `taskAssignments` table, `convex/taskAssignments.ts` (new) | ❌ New |
| 6.3 | **Drag tech onto task time slot** | Frontend | `WOExecutionGantt.tsx` | ❌ New |
| 6.4 | **Training validation on tech-task assignment** | Backend | `convex/taskAssignments.ts` | ❌ New (uses Wave 3 training system) |
| 6.5 | **Task progress tracking (% complete, hours logged)** | Frontend + Backend | `WOExecutionGantt.tsx`, `convex/taskAssignments.ts` | ❌ New |
| 6.6 | **Touch/mobile support for WO Gantt** | Frontend | `WOExecutionGantt.tsx` | ❌ New — built with pointer events from start |
| 6.7 | **Undo support for tech assignments** | Frontend | Reuse `useScheduleUndo.ts` pattern | ❌ New |
| 6.8 | **WO execution page route** | Frontend | `app/(app)/work-orders/[id]/execution/page.tsx` (new) | ❌ New |

**New Convex mutations/queries:**
- `convex/taskAssignments.ts` (new):
  - `listByWorkOrder(workOrderId)` → query
  - `assignTechToTask(taskCardId, technicianId, startTime, endTime)` → mutation (validates training)
  - `moveAssignment(assignmentId, newTechId?, newStart?, newEnd?)` → mutation
  - `removeAssignment(assignmentId)` → mutation
  - `logProgress(assignmentId, hoursWorked, percentComplete)` → mutation
- `convex/schema.ts`:
  - New table: `taskAssignments { workOrderId, taskCardId, technicianId, organizationId, shopLocationId, scheduledStart, scheduledEnd, actualHoursLogged?, percentComplete?, status (scheduled|in_progress|complete), createdAt, updatedAt }`
  - Index: `by_workOrder`, `by_technician`, `by_org`

**Frontend components:**
- New: `app/(app)/work-orders/[id]/_components/WOExecutionGantt.tsx` — full Gantt with tech lanes, task card bars, drag assignment
- New: `app/(app)/work-orders/[id]/execution/page.tsx` — route wrapper
- Modified: Work order detail page — add "Execution Planning" tab/link

**Feature flags:** `scheduler.wave6.woExecutionGantt`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/wo-execution-gantt.spec.ts
# Test: assign tech to task via drag, training validation blocks unqualified, progress tracking updates
```

**Rollback:** Feature flag hides entire execution route. No impact on existing WO flows.

**Dependencies:** Wave 3 (training system), Wave 1 (touch DnD patterns, undo hook)

---

### Wave 7: Multi-Location + Command Center (P1) — Complexity: M — Est: 32 agent-hours

**Goal:** Multi-location support with location switcher affecting all scheduling views. Command center for config/personnel/financial controls.

| # | Deliverable | B/F | File Path | Status |
|---|------------|-----|-----------|--------|
| 7.1 | Location switcher in scheduling nav | Frontend | `components/LocationSwitcher.tsx` | ✅ Exists |
| 7.2 | All scheduling queries scoped by location | Backend | `convex/schedulerPlanning.ts`, `convex/capacity.ts` | ✅ Done |
| 7.3 | **Multi-location onboarding (add locations in wizard)** | Frontend | `SchedulingOnboardingPanel.tsx` | ❌ New |
| 7.4 | **Repair station cert display per location** | Frontend + Backend | Location settings + scheduling header | ❌ New |
| 7.5 | Command center dialog | Frontend | `SchedulingCommandCenterDialog.tsx` | ✅ Done |
| 7.6 | **Command center: inline tech shift editing** | Frontend | `SchedulingCommandCenterDialog.tsx` | ❌ Phase B |
| 7.7 | **Command center: role-based access** | Backend | `convex/schedulerPlanning.ts` | ❌ Gap |

**New Convex mutations/queries:**
- `convex/shopLocations.ts`: Add `repairStationCerts` field (array of cert strings)
- RBAC helper: `checkSchedulingPermission(userId, action)` in `convex/schedulerPlanning.ts`

**Feature flags:** `scheduler.wave7.multiLocationOnboarding`, `scheduler.wave7.rbac`

**Test gate:**
```bash
npx tsc --noEmit
npx playwright test e2e/scheduling-multilocation.spec.ts
# Test: switch location → all data updates, create WO in location B → doesn't appear in location A
```

**Rollback:** Location scoping already works. New features are additive.

**Dependencies:** Wave 1 (onboarding), Wave 2 (command center base)

---

### Wave 8: Hardening & Cleanup (P2) — Complexity: L — Est: 40 agent-hours

**Goal:** Cross-cutting quality, deprecation, performance, and full regression.

| # | Deliverable | B/F | File Path |
|---|------------|-----|-----------|
| 8.1 | **Deprecate `GanttChart.tsx`** (old implementation) | Frontend | Delete or redirect |
| 8.2 | **Deprecate `convex/scheduling.ts` old mutations** | Backend | Remove `updateWOSchedule`, `assignWOToBay`, `getScheduledWOs` |
| 8.3 | **RBAC on all scheduling mutations** | Backend | `schedulerPlanning.ts`, `capacity.ts`, `taskAssignments.ts` |
| 8.4 | **Audit log for all schedule/assignment changes** | Backend | All scheduling mutations |
| 8.5 | **Performance: virtualize Gantt rows >20 bays** | Frontend | `GanttBoard.tsx` |
| 8.6 | **Conflict resolution wizard** | Frontend | New component in scheduling |
| 8.7 | **Full E2E regression suite** | Test | `e2e/` |
| 8.8 | **Feature flag cleanup** | Backend + Frontend | Remove flags for shipped waves |
| 8.9 | **Mobile-specific Gantt layout (portrait mode)** | Frontend | `GanttBoard.tsx`, `WOExecutionGantt.tsx` |
| 8.10 | **Offline/PWA graceful degradation** | Frontend | Service worker + queue |

**Feature flags:** N/A (hardening wave)

**Test gate:**
```bash
npx tsc --noEmit
npm run build
npx playwright test --project=chromium-authenticated
# Performance: scheduling page loads <2s with 30 WOs, 10 bays
# Mobile: all critical flows pass on iPad Safari + Android Chrome
```

**Rollback:** N/A (hardening wave — each item is independently shippable)

**Dependencies:** All prior waves

---

## Dependency Graph

```
Wave 1 (Onboarding + Core DnD) ─────┬── Wave 2 (Fullscreen + Panels + P&L)
                                     │
                                     ├── Wave 3 (Edit Mode + Magic + Training)
                                     │        │
                                     │        ├── Wave 6 (WO Execution Gantt)
                                     │        │
                                     ├── Wave 4 (Quote Parity + Embedded Builder)
                                     │        │
                                     │        └── Wave 5 (Carry-Forward + Graveyard + AD)
                                     │
                                     └── Wave 7 (Multi-Location + Command Center)
                                              │
                                              └── Wave 8 (Hardening)
```

**Parallelism:** Waves 2, 3, 4, and 7 can run in parallel after Wave 1. Wave 5 depends on Wave 4. Wave 6 depends on Wave 3. Wave 8 is terminal.

---

## New Features Not In Original Plans

### 1. Carry-Forward Work Orders (Deferred Maintenance)
- **What:** When a WO closes, deferred maintenance items and notes are saved per aircraft
- **Where they surface:** Fleet detail, new quote composer (auto-suggest), new WO creation
- **Why:** Sam says this is how shops track "we noticed X but customer didn't authorize it" — critical for repeat business and safety
- **Data model:** New `carryForwardItems` table linked to aircraft

### 2. WO-Level Tech-to-Task Gantt
- **What:** Separate Gantt inside each WO for assigning specific technicians to specific task cards
- **Where:** `/work-orders/[id]/execution` — new route
- **Why:** Shop Gantt = strategic planning (which WO in which bay). WO Gantt = tactical execution (which tech does which task when)
- **Scope:** Full drag-drop, training validation, progress tracking

### 3. Training-Based Assignment Validation
- **What:** Replace A&P/IA rating checks with training record validation (91.411, 91.413, borescope, NDT, custom)
- **Where:** Magic scheduler, WO execution Gantt, manual tech assignment
- **Data model:** New `technicianTraining` table + `requiredTraining` field on task cards

### 4. Undo Stack + Keyboard Shortcuts
- **What:** Ctrl+Z / ⌘Z for last 5 scheduling operations. Plus F11 fullscreen, Esc exit, arrow navigation
- **Where:** Shop Gantt + WO Execution Gantt
- **Implementation:** Client-side undo stack storing mutation inverses

### 5. Touch/Mobile Support Throughout
- **What:** All drag-drop, resize, and interaction patterns work with touch/pointer events
- **Where:** Shop Gantt, WO Execution Gantt, quote line reorder, panel interactions
- **Implementation:** Replace `onMouse*` handlers with `onPointer*` events throughout

### 6. AD-to-WO Task Integration
- **What:** Add airworthiness directives as task cards within a WO, track completion through step sign-offs
- **Where:** WO task card UI, continuous tracking through WO lifecycle
- **Why:** ADs must be continuously tracked; completion flows through normal WO sign-off process

### 7. Lost Quote Graveyard with Retry Workflow
- **What:** Declined/lost quotes appear in graveyard for analysis. One-click clone to retry with modifications
- **Where:** Graveyard sidebar (new tab for quotes), plus carry-forward items from associated deferred maintenance
- **Why:** Learn from losses, retry when circumstances change, don't lose institutional knowledge

---

## Risk Register (Updated)

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | Touch DnD is unreliable across mobile browsers | Medium | High | Use pointer events API (wide support). Test on real devices every wave. Fallback tap-to-assign mode. |
| R2 | WO Execution Gantt scope creep (becomes a full project management tool) | High | Medium | Strict scope: tech × task × time only. No dependencies, no critical path in v1. |
| R3 | Quote parity is the largest wave and blocks carry-forward | Medium | High | Start Wave 4 early (parallel with Wave 2/3). Economics fields are independent of UI. |
| R4 | Training data doesn't exist yet for target customers | High | Low | Make training validation a soft warning initially, not a hard block. Let shops build training records over time. |
| R5 | Offline/connectivity issues in hangars | Medium | Medium | Defer full PWA to Wave 8. Convex optimistic updates handle brief disconnects. Add reconnection indicator. |
| R6 | Two-Gantt architecture creates confusion about which view to use | Low | Medium | Clear naming: "Shop Schedule" vs "WO Execution Plan". Onboarding explains the difference. |
| R7 | RBAC delays every wave if done first | Medium | Medium | Ship RBAC in Wave 7/8 as cross-cutting. Use org admin check as interim guard. |
| R8 | Performance degradation with panels + financial tracker + forecaster all open | Medium | Medium | Lazy-load panels. Virtualize Gantt rows. Set performance budget: <2s load, <100ms interaction. |
| R9 | Carry-forward items accumulate unboundedly per aircraft | Low | Low | Add "dismiss" action with reason. Surface count badge, not full list, in fleet view. |
| R10 | Old `convex/scheduling.ts` mutations called by unknown code paths | Medium | High | Add deprecation warnings immediately (Wave 1). Search for all call sites. Remove in Wave 8. |

---

## Definition of Done (Updated)

A wave is "done" when ALL of the following are true:

1. **Type-safe:** `npx tsc --noEmit` passes with zero errors
2. **Builds:** `npm run build` succeeds
3. **Tests pass:** All Playwright specs for the wave pass on `chromium-authenticated` project
4. **Touch verified:** Critical DnD flows tested on iPad Safari and Android Chrome (manual)
5. **Feature flagged:** All new features gated by flags with documented on/off behavior
6. **Audit logged:** All new mutations write to `auditLog` table
7. **Location scoped:** No query or mutation leaks across `shopLocationId`
8. **Undo works:** All drag/drop and assignment operations are undoable (Ctrl+Z)
9. **Keyboard accessible:** Primary actions have keyboard shortcuts documented in help overlay
10. **No regressions:** Existing scheduling E2E suite continues to pass
11. **Rollback tested:** Feature flag off → previous behavior restored, no broken state
12. **Acceptance criteria met:** Each deliverable's specific acceptance criteria verified

---

## Estimated Total Effort

| Wave | Complexity | Est. Agent-Hours | Parallel Group |
|------|-----------|-----------------|----------------|
| Wave 1: Onboarding + Core | L | 40 | Start |
| Wave 2: Fullscreen + P&L | M | 24 | A (after W1) |
| Wave 3: Magic + Training | L | 48 | A (after W1) |
| Wave 4: Quote Parity | XL | 72 | A (after W1) |
| Wave 5: Carry-Forward + AD | L | 40 | B (after W4) |
| Wave 6: WO Execution Gantt | XL | 64 | B (after W3) |
| Wave 7: Multi-Location | M | 32 | A (after W1) |
| Wave 8: Hardening | L | 40 | Terminal |
| **Total** | | **360** | |

With 3 parallel agent tracks, critical path is: W1 → W4 → W5 + W3 → W6 → W8 ≈ **224 agent-hours on longest path**.

---

## Appendix: File Path Reference

### Existing Scheduling Components
```
app/(app)/scheduling/page.tsx                          — Main scheduling page
app/(app)/scheduling/_components/BacklogSidebar.tsx    — Unscheduled WO list
app/(app)/scheduling/_components/GanttBoard.tsx        — Bay-lane Gantt (shop level)
app/(app)/scheduling/_components/GanttChart.tsx        — OLD Gantt (deprecate in W8)
app/(app)/scheduling/_components/GraveyardSidebar.tsx  — Archive panel
app/(app)/scheduling/_components/DailyFinancialTracker.tsx
app/(app)/scheduling/_components/CapacityForecaster.tsx
app/(app)/scheduling/_components/SchedulingAnalyticsPanel.tsx
app/(app)/scheduling/_components/SchedulingRosterPanel.tsx
app/(app)/scheduling/_components/SchedulingCommandCenterDialog.tsx
app/(app)/scheduling/_components/SchedulingOnboardingPanel.tsx
app/(app)/scheduling/_components/SchedulingQuoteWorkspaceDialog.tsx
app/(app)/scheduling/_components/DraggableWindow.tsx
```

### Existing Scheduling Engine
```
lib/scheduling-engine/cascade-scheduler.ts
lib/scheduling-engine/critical-path.ts
lib/scheduling-engine/earned-value.ts
lib/scheduling-engine/resource-leveling.ts
lib/scheduling-engine/types.ts
lib/scheduling-engine/wbs.ts
```

### Existing Convex Backend
```
convex/scheduling.ts          — OLD mutations (deprecate)
convex/schedulerPlanning.ts   — Current planner mutations (single source of truth)
convex/capacity.ts            — Tech shifts + capacity calculation
convex/schema.ts              — scheduleAssignments, schedulingSettings, workOrders, hangarBays
```

### New Files (Created by This Plan)
```
convex/onboarding.ts                                    — Wave 1
convex/technicianTraining.ts                            — Wave 3
convex/quoteTemplates.ts                                — Wave 4
convex/carryForwardItems.ts                             — Wave 5
convex/taskAssignments.ts                               — Wave 6
app/(app)/scheduling/hooks/useScheduleUndo.ts           — Wave 1
app/(app)/scheduling/hooks/useSchedulerKeyboard.ts      — Wave 1
app/(app)/personnel/[id]/training/page.tsx              — Wave 3
app/(app)/billing/quotes/templates/page.tsx             — Wave 4
app/(app)/work-orders/[id]/_components/WOExecutionGantt.tsx — Wave 6
app/(app)/work-orders/[id]/execution/page.tsx           — Wave 6
```

### New Convex Schema Tables
```
technicianTraining    — Wave 3
quoteTemplates        — Wave 4
carryForwardItems     — Wave 5
taskAssignments       — Wave 6
featureFlags          — Wave 1 (or use existing if present)
```
