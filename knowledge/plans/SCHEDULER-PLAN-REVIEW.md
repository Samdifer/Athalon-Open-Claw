# Scheduler Implementation Plan Review

**Reviewer:** Senior MRO Software Architect  
**Date:** 2026-03-01  
**Plans Reviewed:**
1. Scheduler Parity Missing Items (6 waves, 11 items)
2. Quote Parity + Labor Kits (4 waves)
3. Scheduler Agent Wave Execution (5 waves + Wave 0)

---

## Section A: Questions for Sam (Product Owner)

### Priority & Sequencing
1. **Which waves need to be demo-ready first?** If you're pitching to a Part 145 shop owner in 4 weeks, do they need to see drag-and-drop scheduling + bay assignment, or is the financial planning panel more impressive? I'd guess the former, but your call.

2. **What's the target shop size for initial launch?** A 3-bay shop with 6 techs has very different scheduling needs than a 20-bay operation. The current architecture (loading all WOs and techs into memory, client-side auto-schedule) won't scale past ~200 concurrent WOs without pagination. Is that fine for now?

3. **How do your target customers currently schedule?** Whiteboard? Excel? Corridor conversations? This determines whether "drag WO onto a Gantt lane" is revolutionary or expected table stakes. It also affects onboarding — if they're coming from whiteboards, the onboarding flow (Wave 6) might actually need to be Wave 1.

4. **Is the graveyard/archive feature really P0?** Wave 2 of the parity plan marks archive as P0. In my experience, MRO shops rarely archive mid-stream — they close or cancel WOs. Archive feels like a power-user feature. Can we push it to P1 and pull fullscreen mode or analytics forward instead?

5. **What regulatory constraints apply to scheduling?** Specifically:
   - Do certain task cards require specific tech certifications (A&P, IA, specific type ratings)?
   - Does the scheduler need to validate that a tech assigned to a WO holds the required certs?
   - If yes, this is a massive gap in all three plans — none mention cert-based assignment validation.

6. **What's the expected quote-to-WO conversion rate?** The quote workspace embedded in scheduling is nice, but if 90% of WOs come from walk-ins (not quotes), the embedded quote builder is low-value. What's the actual funnel?

7. **How important is the financial planning panel for launch vs. post-launch?** The daily P&L tracker is impressive engineering but feels like a "wow" feature, not a "need" feature for a shop that's currently using a whiteboard. Would you rather ship scheduling 2 weeks earlier without it?

8. **Do shops need multi-location scheduling or single-shop first?** The code already has `shopLocationId` scoping everywhere, which is good. But the plans don't address cross-location WO transfers or shared tech pools. Is single-location sufficient for v1?

9. **What does "magic scheduler" mean to an MRO shop owner?** Auto-assign by bay availability? By tech cert match? By customer promise date? The current implementation (`magicSchedule`) does priority-ordered bin-packing into bay slots. That's fine, but the name overpromises. Should we rename it to "Auto-Assign" or keep the aspirational branding?

10. **Is there an undo requirement?** The current drag-and-drop has no undo. A shop scheduler who accidentally drops a WO on the wrong bay has to manually fix it. Ctrl+Z for the last 3 scheduling actions would be a huge quality-of-life improvement. Is this P0 or P2?

11. **What's the mobile/tablet story?** Many shop leads walk the floor with an iPad. The current Gantt board is mouse-first (drag, resize, hover tooltips). Touch support is absent from all three plans. When does this matter?

12. **How does the scheduler interact with maintenance tracking compliance (8110-3, 337, etc.)?** The plan says "regulatory maintenance records remain separate from planning archive semantics" — good — but does scheduling need to surface airworthiness directive due-dates as scheduling constraints?

13. **What's the target for "time from onboarding to first scheduled WO"?** This determines how much investment the onboarding flow (currently Wave 6) deserves. If the answer is "5 minutes," Wave 6 needs to move way up.

14. **Do customers expect to see tech-to-task assignment on the Gantt, or just WO-to-bay?** Right now the Gantt shows WOs in bay lanes. Real MRO scheduling often needs to assign specific techs to specific tasks within a WO. Is that in scope for this roadmap or a future phase?

---

## Section B: Gap Analysis

### Critical Gaps

#### 1. No Role-Based Access Control on Scheduling Actions
None of the three plans specify who can:
- Drag a WO onto the board (scheduler role? shop lead? any tech?)
- Archive/restore assignments
- Run magic scheduler
- Edit day models
- Modify financial planning assumptions

The code has no permission checks on `handleScheduleChange`, `handleArchiveAssignment`, or `handleApplyDayModelEdit`. Any authenticated user in the org can do anything. This is a compliance risk for Part 145 operations.

#### 2. No Undo/Rollback for Drag Operations
A mis-drop on the Gantt board immediately persists via `upsertScheduleAssignment`. There's no:
- Client-side undo stack
- Server-side revert mutation
- Confirmation dialog for moves (only archive has two-step confirm)

This is especially dangerous in edit mode where day-model changes take effect immediately.

#### 3. No Conflict Resolution Strategy
`detectConflicts` identifies double-bookings but the plans don't define what happens when a conflict is created. Currently: a warning banner appears. There's no:
- Blocking of conflicting drops
- Resolution wizard ("Bay 2 is full on March 5-8, move to Bay 3?")
- Overbooking mode with acknowledgment

#### 4. Missing Offline/PWA Implications
MRO shops often have spotty connectivity in hangars. The Convex real-time model is great online, but:
- What happens when a scheduler drags a WO while offline?
- Optimistic updates will succeed client-side then fail silently on reconnect
- No offline queue or sync strategy is mentioned

#### 5. Missing Mobile/Touch Support
GanttBoard uses `onMouseDown`, `onMouseMove`, `onMouseUp` exclusively. No touch events. No responsive breakpoints for the Gantt timeline. The BacklogSidebar uses native HTML5 drag which has limited mobile support.

#### 6. No Telemetry/Audit Trail for Scheduling Changes
The plans mention "add telemetry on new interactions" but don't specify:
- What events to track
- Whether to use the existing `auditLog` table (which `capacity.ts` already uses)
- Whether scheduling changes need regulatory-grade audit trails (Part 145 shops may need this)

#### 7. Duplicate Scheduling Mutation Surface
There are two parallel mutation paths:
- `convex/scheduling.ts`: `updateWOSchedule`, `assignWOToBay` (older, Phase 7)
- `convex/schedulerPlanning.ts`: `upsertScheduleAssignment` (newer, planner model)

The scheduling page uses `schedulerPlanning` but the old `scheduling.ts` mutations still exist. This is a consistency risk — nothing prevents calling the old mutations and creating ghost state.

#### 8. Dependencies Between Plans Are Implicit
- Parity Plan Wave 6 (embedded quote builder) depends on Quote Plan Wave 2 (quote builder UX parity)
- Agent Wave 4 (finance planning) depends on Parity Plan Wave 5 (command center)
- None of the plans cross-reference each other or define a unified dependency graph

#### 9. Wave Ordering Issues
- **Parity Wave 2 (Graveyard) as P0 is wrong.** Real MRO shops need drag-and-drop and fullscreen before they need archive. Swap with Wave 3 (fullscreen + panels).
- **Agent Wave 0 (Program Setup) is pure overhead.** "Documentation review complete" is not a test gate. Fold into Wave 1.
- **Quote Plan Wave 3 (Templates) should precede Wave 2 (UX parity).** Templates are the data model; UX consumes them.

#### 10. Missing Error Handling in GanttBoard Drop Handler
The `onDrop` handler in GanttBoard catches errors with `toast.error` but doesn't:
- Revert the visual state on failure
- Handle partial failures in batch operations (auto-schedule, magic scheduler)
- Show specific error context (e.g., "Bay 2 is archived" or "WO is locked")

#### 11. `GanttChart.tsx` vs `GanttBoard.tsx` — Unclear Relationship
Both exist as components. `GanttChart` appears to be an older implementation with its own WO rendering, drag logic, and filter bar. `GanttBoard` is the newer bay-centric view used by the scheduling page. The plans don't mention deprecating or removing `GanttChart`. This is a maintenance burden.

#### 12. Missing Feature Flag Strategy Details
Plans say "feature flag each wave" but don't specify:
- Where flags are stored (Convex? LaunchDarkly? env vars?)
- Flag naming convention
- Who can toggle flags
- Cleanup strategy after rollout

#### 13. No Performance Budget
The scheduling page loads 7 parallel Convex queries on mount. Adding panels (analytics, roster, financial tracker, capacity forecaster) means more data and more re-renders. No performance budget or virtualization strategy is defined for:
- Large WO counts (>100 scheduled)
- Large bay counts (>10)
- Long timelines (>6 months)

---

## Section C: Consolidated & Improved Implementation Plan

### Architecture Principles
1. **Single mutation surface:** All scheduling writes go through `convex/schedulerPlanning.ts`. Deprecate `convex/scheduling.ts` old mutations.
2. **Feature flags in Convex:** `featureFlags` table, keyed by `(organizationId, flagName)`. Server-side checked for mutations, client-side for UI.
3. **Audit everything:** Every scheduling mutation writes to `auditLog`.
4. **Location-scoped always:** No query or mutation leaks across `shopLocationId`.

### Flag Naming Convention
`scheduler.wave{N}.{feature}` — e.g., `scheduler.wave1.backlogDrop`, `scheduler.wave2.fullscreen`

### Consolidated Wave Plan

---

#### Wave 1: Core Board Interaction (P0) — Size: L
**Goal:** Drag-and-drop from backlog to bay, move across bays, resize duration, reorder bay rows.

**Status: ~80% implemented.** Backlog drag, bay drop, cross-bay moves, resize, and bay reorder all work in current code. Remaining work:

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Backlog → bay drag-drop | Frontend | `BacklogSidebar.tsx`, `GanttBoard.tsx` | ✅ Done |
| Cross-bay vertical move | Frontend | `GanttBoard.tsx` | ✅ Done |
| Horizontal date resize | Frontend | `GanttBoard.tsx` | ✅ Done |
| Bay row reorder | Frontend + Backend | `GanttBoard.tsx`, `convex/hangarBays.ts` | ✅ Done |
| Drop-zone visual feedback | Frontend | `GanttBoard.tsx` | ✅ Done (ring highlight) |
| **Undo stack (last 5 ops)** | Frontend | `app/(app)/scheduling/page.tsx` (new `useScheduleUndo` hook) | ❌ New |
| **Drop confirmation for cross-bay moves** | Frontend | `GanttBoard.tsx` | ❌ New |
| **Audit log on schedule change** | Backend | `convex/schedulerPlanning.ts` | ❌ New |
| **Deprecate old `convex/scheduling.ts` mutations** | Backend | `convex/scheduling.ts` | ❌ New |

**Complexity:** L (undo stack is the main new work)  
**Test gate:** `npx tsc --noEmit` + Playwright: backlog drop, bay move, row reorder, undo  
**Rollback:** Feature flag `scheduler.wave1.undoStack` (undo only; core DnD is already shipped)

---

#### Wave 2: Fullscreen + Analytics + Roster Panels (P0) — Size: M
**Goal:** Fullscreen scheduling mode, analytics panel, roster panel — all already exist in code.

**Status: ~95% implemented.** Fullscreen uses URL param `?view=fullscreen`. Analytics, roster, and financial panels all render. Remaining:

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Fullscreen enter/exit | Frontend | `page.tsx` | ✅ Done |
| Analytics panel | Frontend | `SchedulingAnalyticsPanel.tsx` | ✅ Done |
| Roster panel | Frontend | `SchedulingRosterPanel.tsx` | ✅ Done |
| Financial tracker scroll sync | Frontend | `page.tsx` | ✅ Done |
| **Fullscreen toolbar (all actions available)** | Frontend | `page.tsx` | ❌ Missing — fullscreen mode hides the sub-nav toolbar |
| **Keyboard shortcut (F11 or Cmd+Shift+F)** | Frontend | `page.tsx` | ❌ Nice-to-have |
| **Panel state persistence (localStorage)** | Frontend | `page.tsx` | ❌ New — panels reset on refresh |

**Complexity:** M  
**Test gate:** Playwright fullscreen enter/exit, panel toggle, scroll sync  
**Rollback:** Feature flag `scheduler.wave2.fullscreenToolbar`

---

#### Wave 3: Edit Mode + Day Model + Magic Scheduler (P1) — Size: L
**Goal:** Distribute/block day-model editing, board-native magic selection, magic scheduler apply.

**Status: ~90% implemented.** Edit mode toggles, day-segment clicking, magic selection mode, and magic scheduler dialog all work.

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Edit mode toggle + banner | Frontend | `GanttBoard.tsx`, `page.tsx` | ✅ Done |
| Distribute tool (click +1h, shift-click -1h) | Frontend + Backend | `GanttBoard.tsx`, `schedulerPlanning.ts` | ✅ Done |
| Block day toggle | Frontend + Backend | `GanttBoard.tsx`, `schedulerPlanning.ts` | ✅ Done |
| Board-native magic selection | Frontend | `GanttBoard.tsx`, `BacklogSidebar.tsx` | ✅ Done |
| Magic Scheduler dialog + apply | Frontend | `page.tsx` | ✅ Done |
| **Magic scheduler: cert-based filtering** | Backend | `convex/schedulerPlanning.ts` | ❌ Gap — no tech cert validation |
| **Magic scheduler: conflict prevention** | Frontend | `page.tsx` | ❌ Gap — can create double-bookings |
| **Edit mode: visual effort heatmap legend** | Frontend | `GanttBoard.tsx` | ❌ Nice-to-have |

**Complexity:** L (cert-based filtering is the hard part)  
**Test gate:** Playwright for mode switching, day-model edits, magic scheduler flow  
**Rollback:** Feature flag `scheduler.wave3.certFiltering`

---

#### Wave 4: Graveyard/Archive + Command Center (P1) — Size: M
**Goal:** Archive lifecycle, command center dialog for config/personnel/financial controls.

**Status: ~90% implemented.** GraveyardSidebar, archive/restore, and SchedulingCommandCenterDialog all exist.

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Graveyard sidebar | Frontend | `GraveyardSidebar.tsx` | ✅ Done |
| Archive button on Gantt bars | Frontend | `GanttBoard.tsx` | ✅ Done |
| Restore from graveyard | Frontend + Backend | `GraveyardSidebar.tsx`, `schedulerPlanning.ts` | ✅ Done |
| Command Center dialog | Frontend | `SchedulingCommandCenterDialog.tsx` | ✅ Done |
| Financial settings save | Frontend + Backend | `page.tsx`, `schedulerPlanning.ts` | ✅ Done |
| Scheduling settings save | Frontend + Backend | `page.tsx`, `capacity.ts` | ✅ Done |
| **Permanent delete with 2-step confirm** | Frontend + Backend | `GraveyardSidebar.tsx`, `schedulerPlanning.ts` | ❌ Missing |
| **Role-based access on archive/delete** | Backend | `schedulerPlanning.ts` | ❌ Gap |
| **Command center: inline tech shift editing** | Frontend | `SchedulingCommandCenterDialog.tsx` | ❌ Phase B per plan |

**Complexity:** M  
**Test gate:** Playwright archive → restore, archive → delete; permission unit tests  
**Rollback:** Feature flag `scheduler.wave4.permanentDelete`

---

#### Wave 5: Quote System Parity (P1) — Size: XL
**Goal:** Full quote builder parity — line reorder, economics, profitability panel, templates.

**Status: ~40% complete.** Labor kit integration exists. Line reorder, economics fields, and template manager are missing.

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Labor kit apply in quote composer | Frontend + Backend | Quote pages, `convex/quotes.ts` | ✅ Done |
| **`sortOrder` field on `quoteLineItems`** | Backend | `convex/schema.ts`, `convex/quotes.ts` | ❌ New |
| **Line economics fields (`directCost`, `markupMultiplier`, `fixedPriceOverride`, `pricingMode`)** | Backend | `convex/schema.ts`, `convex/quotes.ts` | ❌ New |
| **Drag-reorder line items UI** | Frontend | `quotes/new/page.tsx`, `quotes/[id]/page.tsx` | ❌ New |
| **Expanded line editor (cost, markup, override)** | Frontend | `quotes/[id]/page.tsx` | ❌ New |
| **Quote-level profitability panel** | Frontend | `quotes/[id]/page.tsx` | ❌ New |
| **AOG + requested start/end on quotes** | Frontend + Backend | Schema + quote pages | ❌ New |
| **Quote template manager** | Frontend + Backend | New route + `convex/quoteTemplates.ts` | ❌ New |
| **Backfill migration for existing quotes** | Backend | Migration script | ❌ New |
| **Recompute totals with override-safe logic** | Backend | `convex/quotes.ts` | ❌ New |

**Complexity:** XL  
**Test gate:** `npx tsc --noEmit`, Playwright for line reorder + economics + template insertion, migration safety tests  
**Rollback:** Feature flag `scheduler.wave5.quoteEconomics`, `scheduler.wave5.quoteTemplates`. Backfill migration must be backward-compatible (new fields optional with defaults).

---

#### Wave 6: Embedded Quote + Onboarding (P2) — Size: M
**Goal:** Quote workspace in scheduling context, first-run onboarding flow.

**Status: ~85% implemented.** `SchedulingQuoteWorkspaceDialog` and `SchedulingOnboardingPanel` both exist with localStorage tracking.

| Deliverable | Type | File(s) | Status |
|---|---|---|---|
| Quote workspace dialog | Frontend | `SchedulingQuoteWorkspaceDialog.tsx` | ✅ Done (read-only shell) |
| Onboarding panel + defaults apply | Frontend | `SchedulingOnboardingPanel.tsx`, `page.tsx` | ✅ Done |
| Onboarding skip/complete tracking | Frontend | `page.tsx` (localStorage) | ✅ Done |
| **Quote workspace: inline edit/save** | Frontend | `SchedulingQuoteWorkspaceDialog.tsx` | ❌ Depends on Wave 5 |
| **Onboarding: guided bay creation** | Frontend | `SchedulingOnboardingPanel.tsx` | ❌ Nice-to-have |
| **Onboarding: sample data generation** | Backend | New mutation | ❌ Nice-to-have |

**Complexity:** M  
**Test gate:** Playwright first-run onboarding, quote workspace open/edit from scheduler  
**Rollback:** Feature flag `scheduler.wave6.quoteWorkspaceEdit`

---

#### Wave 7: Hardening & Cleanup (P2) — Size: L
**Goal:** Cross-cutting quality work that the three plans mention but don't allocate.

| Deliverable | Type | File(s) |
|---|---|---|
| **Deprecate `GanttChart.tsx`** (old implementation) | Frontend | Delete or mark deprecated |
| **Deprecate `convex/scheduling.ts` old mutations** | Backend | Remove or redirect |
| **Add RBAC checks to all scheduling mutations** | Backend | `schedulerPlanning.ts`, `capacity.ts` |
| **Add audit log entries for all schedule changes** | Backend | `schedulerPlanning.ts` |
| **Touch/tablet support for Gantt DnD** | Frontend | `GanttBoard.tsx` |
| **Performance: virtualize Gantt rows >20 bays** | Frontend | `GanttBoard.tsx` |
| **Performance: paginate WO queries >200** | Backend | `convex/workOrders.ts` |
| **Full E2E regression suite** | Test | `e2e/` |
| **Feature flag cleanup for shipped waves** | Backend + Frontend | All flagged code |

**Complexity:** L  
**Test gate:** Full CI suite green, performance benchmarks within budget  
**Rollback:** N/A (hardening wave)

---

### Dependency Graph

```
Wave 1 (Core DnD) ──────┐
                         ├── Wave 3 (Edit Mode + Magic)
Wave 2 (Fullscreen) ─────┘
                              │
                              ├── Wave 4 (Archive + Command Center)
                              │
Wave 5 (Quote Parity) ───────┤
                              │
                              └── Wave 6 (Embedded Quote + Onboarding)
                                       │
                                       └── Wave 7 (Hardening)
```

Waves 1 and 2 can run in parallel. Wave 5 (Quote) is independent and can start anytime but Wave 6 depends on it. Wave 7 is terminal.

### Key Takeaways

1. **The app is further along than the plans suggest.** Most of Waves 1-4 are already implemented. The plans read like pre-implementation specs, but the code shows post-implementation reality. The real work is in Wave 5 (quote parity) and Wave 7 (hardening).

2. **The biggest real gaps are non-functional:** RBAC, undo, audit trails, mobile support, and conflict prevention. These aren't glamorous but they're what a Part 145 shop auditor will ask about.

3. **The three plans should be one plan.** Having scheduler parity, quote parity, and agent execution as separate documents with separate wave numbering creates confusion. This review document serves as that unified view.

4. **Quote parity is the actual hard work remaining.** Everything else is polish on an already-functional scheduling board.

5. **Consider moving onboarding earlier** if target customers are non-technical shop owners. The current code drops you into a Gantt chart cold — that's intimidating for someone coming from a whiteboard.
