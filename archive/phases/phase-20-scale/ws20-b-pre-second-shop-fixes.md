# WS20-B — Pre-Second-Shop Fixes
**Phase:** 20 — Scale  
**Status:** SHIPPED ✅  
**Owner:** Chloe Marsh + Finn Calloway + Devraj Anand  
**Gate:** All 3 fixes shipped and Cilla-tested before second-shop onboarding begins  
**Acceptance:** Carla Ostrowski (first shop DOM) — confirmation for each fix

---

## Context

Second-shop onboarding is authorized pending these three fixes. They surfaced during the Phase 19 live operation at Skyline Aviation: one from the feature request queue (FR-001), one from the coordinator feedback session (FR-004), and one that Carla's lead tech Ellen noticed herself and mentioned in passing — which Nadia flagged as must-fix before a second shop sees the product for the first time.

None are blockers in the sense that the system breaks. They're blockers in the sense that a new shop's first impression matters, and these are friction points the team can see coming.

---

## Fix 1 — FR-001: Aircraft Sidebar
**What it is:** Quick navigation between aircraft from any work order view.  
**Owners:** Chloe Marsh (UI component) + Finn Calloway (routing + state persistence)  
**Effort:** 1 day  
**Filed by:** Danny Osei, during the Phase 19 feedback session — *"If I'm inside a work order on N8432Q and I want to check something on N2271S, I have to navigate all the way back to the home screen. With two aircraft it's annoying. With ten it's a problem."*

### What Was Built
A collapsible sidebar panel available from any active work order view. Renders the shop's aircraft list as a vertical stack of cards — aircraft tail number, make/model, current status (no active WO / WO open / WO in progress / AOG). Clicking any card opens that aircraft's work order summary without losing the current WO context (current WO stays in a breadcrumb trail at the top). Sidebar state is persisted per-user in localStorage so it stays open/closed between views. On mobile, the sidebar becomes a bottom sheet triggered by a single tap on a persistent aircraft icon in the nav bar.

**Chloe's implementation note:** The sidebar uses a shared `AircraftContextProvider` that any view can subscribe to. Future features that need aircraft navigation (LLP dashboard cross-aircraft lookup, multi-aircraft task board) can hook into the same provider without re-implementing navigation.

**Finn's routing work:** Deep-link routing updated. `/work-orders/:woId/aircraft/:tailNum` resolves correctly. Back button behavior tested across iOS Safari and Chrome Android.

### Cilla's Test Pass
- **TC-SIDEBAR-1:** From WO view, open sidebar, tap second aircraft — correct aircraft summary loads, breadcrumb shows return path. ✅
- **TC-SIDEBAR-2:** Mobile bottom sheet behavior — trigger, select aircraft, navigate, return. ✅
- **TC-SIDEBAR-3:** Sidebar state persists across page reload (localStorage). ✅
- **TC-SIDEBAR-4:** AOG status indicator shows correctly for aircraft with no active WO vs open WO vs AOG-flagged. ✅
- **All 4 test cases PASS — Cilla sign-off: 2026-02-22T14:30Z**

### Deployed to Production
`npx convex deploy --env production --message "FR-001: Aircraft sidebar — Chloe + Finn"`  
Frontend build deployed via CI. **2026-02-22T15:00Z**

### Carla's Acceptance Note
*"This is the thing I didn't know I needed until I was in it. Last week I was checking on N2271S and I had N8432Q open and I just... went all the way back to the home screen like I always have. Now I don't have to. Ellen's going to use this constantly."*  
— Carla Ostrowski, 2026-02-22

---

## Fix 2 — FR-004: Parts Dashboard
**What it is:** Coordinator view of all parts currently in `pending_inspection` status, organized by work order.  
**Owners:** Devraj Anand (Convex query + data layer) + Chloe Marsh (UI)  
**Effort:** 2 days  
**Filed by:** Carla during the Week 2 check-in — *"Right now I have to open each work order to see where parts stand. If I've got three WOs running and six parts waiting on inspection, I have no way to see that in one place. I'm clicking in and out all day."*

### What Was Built
A new top-level coordinator view: **Parts Dashboard**. Accessible from the main navigation. Renders a filterable table of all parts currently in `pending_inspection`, `pending_order`, or `received_not_inspected` states, grouped by work order. Each row shows: part number, description, part status, associated WO number, which task card is waiting on it, the receiving technician (if received), and a timestamp of how long it's been in the current status.

Filters: by WO, by status bucket, by "waiting on me" (parts where the coordinator is the assigned inspector). Sort by status age descending — oldest pending items float to the top.

Devraj added a Convex `getCoordinatorPartsDashboard(shopId, filters)` query with real-time subscription so the dashboard updates live when any part status changes anywhere in the shop. The coordinator doesn't need to refresh.

**Devraj's implementation note:** The query is intentionally scoped to the coordinator role. Technicians don't see this view — it's coordinator-only. Parts data was already in the database; this is purely a presentation layer over existing mutations. The only schema addition was a `pending_since` timestamp on the `parts` table to power the "time in status" column.

### Cilla's Test Pass
- **TC-PARTS-1:** Dashboard loads with all pending parts grouped by WO. Filter by WO number narrows correctly. ✅
- **TC-PARTS-2:** Real-time update — Cilla updates a part status in another tab. Dashboard updates within 2 seconds. ✅
- **TC-PARTS-3:** "Waiting on me" filter returns only parts where coordinator is assigned inspector. ✅
- **TC-PARTS-4:** Parts dashboard inaccessible to technician role — 403 on direct URL, nav item hidden. ✅
- **TC-PARTS-5:** Sort by status age — oldest items correctly at top. ✅
- **All 5 test cases PASS — Cilla sign-off: 2026-02-22T20:00Z**

### Deployed to Production
`npx convex deploy --env production --message "FR-004: Coordinator parts dashboard — Devraj + Chloe"`  
**2026-02-22T20:30Z**

### Carla's Acceptance Note
*"I opened it this morning and I could see everything. Six parts, three work orders, sorted by how long they've been sitting. The two that have been in pending_inspection for four days — I wouldn't have known those were sitting there without digging. Now I see it the moment I open the app. This is going to matter even more for a bigger shop."*  
— Carla Ostrowski, 2026-02-22

---

## Fix 3 — Ellen's Button Placement Fix (RTS Button)
**What it is:** Move the Return to Service button to where Ellen's hand actually goes.  
**Owner:** Finn Calloway  
**Effort:** 2 hours  
**Source:** Carla mentioned in passing during the Week 3 check-in — *"Ellen reached for the RTS button in the wrong spot twice this week. She keeps going to the bottom right. It's up top. It'll be muscle memory eventually but if you can just move it that would be great."*  
Nadia flagged this immediately: before a second shop's first user sees the product, fix the thing the first user's hands got wrong.

### What Was Built
Finn reviewed Ellen's described behavior — she was reaching bottom-right, which is where every other mobile action button lives (submit, confirm, save). The RTS button was positioned top-right in the work order header, making it visually prominent but spatially inconsistent with how technicians expect to confirm final actions on mobile.

Finn moved the RTS button to a persistent floating action area at the bottom of the work order view on mobile — same position as confirm/submit actions. On desktop it remains in the action bar but is now bottom-aligned with other primary actions rather than floating in the header. The button's visual weight (color, size) was unchanged — it's still clearly the most important action on the screen.

**Finn's note:** The previous placement was a design decision from Phase 17 where "prominence = top" logic was applied. On mobile, thumb ergonomics matter more than visual prominence. Ellen's instinct was correct.

### Cilla's Test Pass
- **TC-RTS-1:** RTS button renders at bottom on mobile (iPhone 14 + Galaxy Tab A8). ✅
- **TC-RTS-2:** RTS button remains functionally identical — all pre-conditions still enforced (all task cards complete, Marcus compliance state = CLEAR). ✅
- **TC-RTS-3:** Desktop action bar — RTS button bottom-aligned with other primary actions. ✅
- **All 3 test cases PASS — Cilla sign-off: 2026-02-22T09:30Z** (Finn had this done before lunch)

### Deployed to Production
`npx convex deploy --env production --message "RTS button placement fix — Ellen's feedback — Finn"`  
**2026-02-22T10:00Z**

### Carla's Acceptance Note
*"I showed Ellen this morning. She went straight to it. Didn't even think about it. That's the right answer."*  
— Carla Ostrowski, 2026-02-22

---

## WS20-B Summary

| Fix | Owner | Effort | Cilla Pass | Deployed | Carla Accepted |
|---|---|---|---|---|---|
| FR-001: Aircraft Sidebar | Chloe + Finn | 1 day | ✅ 14:30Z | ✅ 15:00Z | ✅ |
| FR-004: Parts Dashboard | Devraj + Chloe | 2 days | ✅ 20:00Z | ✅ 20:30Z | ✅ |
| RTS Button Placement | Finn | 2 hours | ✅ 09:30Z | ✅ 10:00Z | ✅ |

**All three fixes shipped. Second-shop onboarding gate cleared.**

The order of deployment: Ellen's button fix first (2 hours, done before the other two were underway), then the parts dashboard (longest, Devraj needed the full 2 days), then the aircraft sidebar (1 day, shipped after the button fix). Cilla had all three signed off by end of day 2026-02-22.

---

*WS20-B closed by Chloe Marsh + Finn Calloway + Devraj Anand — 2026-02-22*  
*Carla's acceptance notes collected by Nadia Solis — 2026-02-22*
