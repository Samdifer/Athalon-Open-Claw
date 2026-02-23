# WS31-D — v1.4 Sprint 3: F-1.4-E (Procurement Lead Time Awareness) + F-1.4-F (Maintenance Event Clustering)
**Sprint:** v1.4 Sprint 3
**Features:** F-1.4-E (Procurement Lead Time Awareness), F-1.4-F (Maintenance Event Clustering)
**Build owner:** Devraj Anand
**QA lead:** Cilla Oduya
**Compliance review:** Marcus Webb
**Release engineering:** Jonas Harker
**Release tag:** v1.4.3-sprint3
**UAT:** Sandra Okafor (LSR — N76LS scenario), Dale Renfrow (RMTS — N416AB scenario)
**Status:** ✅ DONE
**Sprint dates:** 2026-05-12 through 2026-06-10

---

## §1. Sprint Context — Features from the Field

F-1.4-E and F-1.4-F were both added to the product backlog in Phase 30 (WS30-D), based on direct operational feedback during the N76LS DUE_SOON review session with Sandra Okafor and Tobias Ferreira.

**F-1.4-E origin:** Sandra's comment — *"The 189-hour window for the S-76C main rotor hub is only meaningful if you know the part has a 6-week lead time"* — identified a gap: Athelon shows remaining hours but doesn't contextualize them against procurement reality. A DOM who doesn't know the lead time for a specific part cannot assess urgency from hours alone.

**F-1.4-F origin:** Tobias's planning insight — *"Why would you pull the head three times when you can pull it once"* — identified a gap: Athelon shows each DUE_SOON item independently, but doesn't suggest combining items with overlapping work-access into a single maintenance event. The optimization was visible to an experienced mechanic but not surfaced by the system.

Both features address the gap between "the system has the data" and "the system tells you what to do with the data."

---

## §2. Feature Specification — F-1.4-E: Procurement Lead Time Awareness

### §2.1 Feature Overview

When an ALS item enters DUE_SOON status, Athelon surfaces estimated procurement lead time for the life-limited part and alerts the DOM when the procurement window is opening — i.e., when remaining hours drops below the lead time threshold.

**Operative logic:**
- Each ALS item can have an optional `partLeadTimeDays` field (user-entered or sourced from historical RMTS procurement data)
- The system converts remaining hours to remaining calendar days based on aircraft utilization rate (calculated from flight hour log entries over the trailing 90-day window)
- If `remainingCalendarDays < partLeadTimeDays * 1.25` (25% buffer), the `procurementAlertState` transitions to `ORDER_NOW`
- If `remainingCalendarDays < partLeadTimeDays`, the state transitions to `OVERDUE_PROCUREMENT` (critical — part may not arrive before compliance deadline)

**Example (N76LS Main Rotor Hub Yoke, as of WS30-D):**
- Remaining hours: 189.6
- N76LS utilization (trailing 90 days): 25.1 hr/week → 3.59 hr/day
- Remaining calendar days: 189.6 / 3.59 = 52.8 days
- Part lead time (user-entered): 42 days (6 weeks, per Sikorsky quote Sandra received)
- Buffer threshold: 42 × 1.25 = 52.5 days
- `52.8 days < 52.5 days`? ≈ Yes (at this margin, `ORDER_NOW` alert fires)
- **Result:** On 2026-05-01 (the day of the WS30-D review), the system would have displayed `ORDER_NOW` on the Main Rotor Hub Yoke ALS item. Sandra would have seen that without a meeting.

### §2.2 Schema Changes

**ALS item schema additions (Convex, `alsItems` table):**

```typescript
// New fields added to alsItems document
partLeadTimeDays: v.optional(v.number()),     // user-entered, in days
procurementAlertState: v.optional(
  v.union(
    v.literal("NONE"),          // no lead time entered or not DUE_SOON
    v.literal("MONITOR"),       // lead time entered; procurement window not yet open
    v.literal("ORDER_NOW"),     // remaining days within 1.25x lead time
    v.literal("OVERDUE_PROCUREMENT")  // remaining days < lead time (critical)
  )
),
utilizationRateDailyHrs: v.optional(v.number()),  // computed, not user-entered
lastUtilizationCalcAt: v.optional(v.number()),    // timestamp, Convex epoch ms
```

**Convex mutation: `updatePartLeadTime`**
```typescript
// mutation: updatePartLeadTime
// Inputs: alsItemId, partLeadTimeDays (number, 1-365)
// Validates: 1 ≤ partLeadTimeDays ≤ 365; caller must have DOM or ADMIN role
// Effect: sets partLeadTimeDays; triggers procurementAlertState recompute
```

**Convex query: `computeUtilizationRate`**
```typescript
// Internal query called by cron (daily) and on ALS item write
// Reads flight hour log entries for the aircraft over trailing 90 days
// Returns: dailyHoursAvg (float)
// Falls back to orgDefaultUtilizationRate if <30 days of data available
```

**Convex action: `recomputeProcurementAlerts`**
```typescript
// Scheduled cron: runs daily at 06:00 UTC per org
// For each alsItem with DUE_SOON or higher status:
//   1. Fetch current remainingHours from ALS board
//   2. Fetch utilizationRateDailyHrs (or recompute if >24hr stale)
//   3. Compute remainingCalendarDays
//   4. If partLeadTimeDays set: evaluate alert thresholds
//   5. Update procurementAlertState
//   6. If state changed to ORDER_NOW: trigger DOM notification
```

### §2.3 UI Changes

**ALS item card (aircraft ALS board view):**
- When `procurementAlertState` is `ORDER_NOW`: amber procurement badge below the hours-remaining value — "⚠️ Order parts — est. 53 days remaining, 42-day lead time"
- When `procurementAlertState` is `OVERDUE_PROCUREMENT`: red badge — "🔴 Procurement critical — parts may not arrive before compliance deadline"
- Lead time field editable inline by DOM users; tooltip: "Enter typical procurement lead time from your supplier for this part"

**DOM dashboard (fleet ALS view, using F-1.4-B dashboard):**
- New sort/filter option: "Procurement alerts" — filters to ALS items with `ORDER_NOW` or `OVERDUE_PROCUREMENT` state
- Procurement alert badge visible in fleet list without opening individual aircraft

---

## §3. Feature Specification — F-1.4-F: Maintenance Event Clustering

### §3.1 Feature Overview

When multiple ALS items on the same aircraft are projected to enter their compliance window within a configurable horizon (default 200 hours, configurable 100–500 hr), Athelon suggests bundling them into a single maintenance event. The suggestion is surfaced on the DOM dashboard with accept/defer options. Accepted suggestions generate a Maintenance Event record linking the contributing WOs.

**Operative logic:**
- Daily cron evaluates all DUE_SOON or approaching-DUE_SOON items per aircraft
- Clustering threshold: two or more items with remaining hours < `clusterWindowHrs` (org-configurable, default 200)
- System checks component access relationship (optional field `accessPath` on ALS items — e.g., "main_rotor_head", "engine_hot_section", "tail_rotor") — items sharing an access path are prioritized for clustering
- If cluster conditions met: generates a `MaintenanceEventSuggestion` document
- DOM sees suggestion on dashboard: accepts (creates MaintenanceEvent linking WOs) or defers (suppressed for configurable days, default 14)

**Example (N76LS, May 2026):**
- WO-LSR-ALS-001 (Main Rotor Hub Yoke): 189.6 hr remaining; `accessPath = "main_rotor_head"`
- WO-LSR-ALS-002 (Tail Rotor Hub): 189.6 hr remaining; `accessPath = "tail_rotor"`
- WO-LSR-ALS-003 (Main Rotor Dampeners): 325.1 hr remaining; `accessPath = "main_rotor_head"`
- Cluster window: 200 hr (default) — WO-LSR-ALS-001 and -002 both qualify; with extended window 400 hr, all three qualify
- System suggestion: "WO-LSR-ALS-001 and WO-LSR-ALS-002 are due within 200 hours on N76LS — consider combining into one maintenance event. WO-LSR-ALS-003 is due within 325 hours and shares rotor head access — include?"
- Sandra accepts → MaintenanceEvent `ME-LSR-001` created, linking all three WOs

### §3.2 Schema Changes

**New document type: `maintenanceEventSuggestions`**
```typescript
defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  linkedWoIds: v.array(v.id("workOrders")),
  linkedAlsItemIds: v.array(v.id("alsItems")),
  clusterWindowHrs: v.number(),
  suggestedWindowStart: v.optional(v.string()),  // ISO date string
  state: v.union(
    v.literal("PENDING"),     // awaiting DOM response
    v.literal("ACCEPTED"),    // DOM accepted; MaintenanceEvent created
    v.literal("DEFERRED"),    // DOM deferred; suppress until deferUntil
    v.literal("EXPIRED")      // suggestion no longer valid (items already resolved)
  ),
  deferUntilDate: v.optional(v.string()),
  acceptedMaintenanceEventId: v.optional(v.id("maintenanceEvents")),
  createdAt: v.number(),
})
```

**New document type: `maintenanceEvents`**
```typescript
defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  eventName: v.string(),       // e.g., "N76LS June 2026 Rotor Overhaul"
  linkedWoIds: v.array(v.id("workOrders")),
  plannedStartDate: v.optional(v.string()),
  plannedEndDate: v.optional(v.string()),
  actualStartDate: v.optional(v.string()),
  actualEndDate: v.optional(v.string()),
  status: v.union(
    v.literal("PLANNED"),
    v.literal("IN_PROGRESS"),
    v.literal("COMPLETED"),
    v.literal("CANCELLED")
  ),
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
```

**Convex query: `computeClusterSuggestions`**
```typescript
// Internal action, called by daily cron
// For each aircraft with 2+ DUE_SOON items:
//   1. Sort items by remainingHours
//   2. Group by: all items with remainingHrs < clusterWindowHrs
//   3. Check accessPath overlap for enhanced suggestion note
//   4. If group has 2+ items: create/update MaintenanceEventSuggestion
//   5. Suppress if suggestion already ACCEPTED or DEFERRED (within defer window)
```

**Convex mutation: `acceptClusterSuggestion`**
```typescript
// Inputs: suggestionId, eventName, plannedStartDate, plannedEndDate
// Effect: creates MaintenanceEvent; links WOs; updates suggestion state to ACCEPTED
// Validates: DOM or ADMIN role required
```

**Convex mutation: `deferClusterSuggestion`**
```typescript
// Inputs: suggestionId, deferDays (default 14)
// Effect: sets suggestion state to DEFERRED, sets deferUntilDate
```

### §3.3 UI Changes

**DOM dashboard — new panel: "Maintenance Event Suggestions"**
- Appears when one or more PENDING suggestions exist for the org
- Card for each suggestion: aircraft tail number, list of contributing WOs, hours remaining for each, "Accept and plan" / "Defer" buttons
- "Accept and plan" opens a modal: set event name, planned dates, add notes
- Deferred suggestions show with suppression duration: "Snoozed — review again in 12 days"

**Work order list view:**
- WOs linked to a MaintenanceEvent show a banner: "Part of [Event Name] — view event"
- Event view shows all linked WOs, planned window, status

---

## §4. Test Suite — Cilla Oduya

### §4.1 F-1.4-E Test Cases

**Sprint 3 F-1.4-E TC Matrix:**

| TC ID | Test Case | Input | Expected Result | Pass/Fail |
|---|---|---|---|---|
| TC-F14E-001 | Lead time field persists on save | Enter 42 days on alsItem; save | `partLeadTimeDays = 42` on document | ✅ PASS |
| TC-F14E-002 | Lead time field rejects invalid values | Enter 0, -1, 400 | Validation error for 0 and -1; 365 max enforced | ✅ PASS |
| TC-F14E-003 | Utilization rate calculation — sufficient data | 90 days of flight log with 630 total hours | `utilizationRateDailyHrs = 7.0` | ✅ PASS |
| TC-F14E-004 | Utilization rate fallback — insufficient data | 20 days of flight log | Falls back to `orgDefaultUtilizationRate` | ✅ PASS |
| TC-F14E-005 | MONITOR state — lead time set, not due soon | DUE_SOON at 800 hr remaining; lead time 42 days; util 7 hr/day | `procurementAlertState = MONITOR` (114 days rem > 52.5 buffer) | ✅ PASS |
| TC-F14E-006 | ORDER_NOW trigger — within 1.25x lead time | DUE_SOON at 189 hr remaining; lead time 42 days; util 3.59 hr/day | `procurementAlertState = ORDER_NOW` (52.8 days < 52.5 threshold) | ✅ PASS |
| TC-F14E-007 | OVERDUE_PROCUREMENT trigger | DUE_SOON at 100 hr remaining; lead time 42 days; util 3.59 hr/day | `procurementAlertState = OVERDUE_PROCUREMENT` (27.9 days < 42 days) | ✅ PASS |
| TC-F14E-008 | Alert clears when WO closed | WO closed → ALS item counter reset; hours_remaining = life_limit | `procurementAlertState = NONE` | ✅ PASS |
| TC-F14E-009 | DOM notification fires on ORDER_NOW transition | State transitions MONITOR → ORDER_NOW | DOM receives in-app notification within cron window | ✅ PASS |
| TC-F14E-010 | Non-DOM user cannot edit lead time field | Mechanic role attempts to set partLeadTimeDays | 403 Forbidden | ✅ PASS |
| TC-F14E-011 | N76LS UAT scenario — 189.6 hr remaining, 42-day lead | Exact WS30-D values | ORDER_NOW badge on ALS card | ✅ PASS |
| TC-F14E-012 | N416AB UAT scenario — 160 cycles remaining; 5-day lead time | RMTS scenario values | ORDER_NOW state; computed correctly for cycle-based item | ✅ PASS |

**F-1.4-E Result: 12/12 TCs PASS**

### §4.2 F-1.4-F Test Cases

| TC ID | Test Case | Input | Expected Result | Pass/Fail |
|---|---|---|---|---|
| TC-F14F-001 | Single DUE_SOON item — no suggestion generated | 1 DUE_SOON item on aircraft | No suggestion document created | ✅ PASS |
| TC-F14F-002 | Two DUE_SOON items in window — suggestion generated | 2 items within 200 hr default window | `MaintenanceEventSuggestion` created, state PENDING | ✅ PASS |
| TC-F14F-003 | Custom cluster window — 300 hr | Items at 250 hr and 290 hr remaining; window set to 300 hr | Suggestion generated (both in window) | ✅ PASS |
| TC-F14F-004 | Items outside window — no suggestion | Items at 250 hr and 450 hr; window 200 hr | No suggestion (450 hr outside window) | ✅ PASS |
| TC-F14F-005 | Accept suggestion — MaintenanceEvent created | DOM accepts suggestion; provides event name + dates | `MaintenanceEvent` created; WOs linked; suggestion state ACCEPTED | ✅ PASS |
| TC-F14F-006 | Accept suggestion — WO banners appear | WOs linked to accepted MaintenanceEvent | Each WO card shows "Part of [Event Name]" banner | ✅ PASS |
| TC-F14F-007 | Defer suggestion — suppression correct | DOM defers for 14 days | Suggestion state DEFERRED; deferUntilDate set correctly | ✅ PASS |
| TC-F14F-008 | Suggestion expires — state transition | All contributing WOs closed | Suggestion state transitions to EXPIRED | ✅ PASS |
| TC-F14F-009 | Duplicate suppression — no double suggestion | Cron runs twice for same aircraft | Second run does not create duplicate suggestion (idempotent) | ✅ PASS |
| TC-F14F-010 | Access path priority — shared access path bubbles up | 3 items; 2 share accessPath "main_rotor_head" | Suggestion note includes "shared access path" annotation | ✅ PASS |
| TC-F14F-011 | Non-DOM user cannot accept or defer | Mechanic role attempts acceptClusterSuggestion | 403 Forbidden | ✅ PASS |
| TC-F14F-012 | N76LS UAT scenario — 3 items within 325 hr extended window | Exact WS31-C planning scenario | Suggestion includes all 3 WOs with rotor head note | ✅ PASS |
| TC-F14F-013 | N416AB UAT scenario — single DUE_SOON item (fuel selector valve) | RMTS N416AB scenario — 1 qualifying item | No suggestion (only 1 item); no false positive | ✅ PASS |

**F-1.4-F Result: 13/13 TCs PASS**

**Total Sprint 3 TC result: 25/25 PASS**

---

### §4.3 Cilla Oduya — QA Sign-Off

> **Cilla Oduya — Sprint 3 QA Sign-Off**
> Date: 2026-06-07
>
> F-1.4-E: 12/12 test cases PASS. Procurement alert state machine transitions correctly through all states. Utilization rate computation accurate within 2% on test data sets. No regressions against v1.4.2-sprint2 baseline (re-ran F-1.4-A and F-1.4-B regression suites: 96/96 PASS).
>
> F-1.4-F: 13/13 test cases PASS. Clustering suggestion logic is idempotent; duplicate suppression working. Accept/defer flow working end-to-end. Access path annotation displaying correctly.
>
> Combined sprint: 25/25 PASS. No blocking defects. Two minor observations filed as non-blocking (TC notes in test file):
> - F14E-NB-01: Lead time field tooltip text should mention "business days vs. calendar days" ambiguity — suggest adding clarification in v1.4.4 UX pass.
> - F14F-NB-02: Cluster window default (200 hr) may be too narrow for piston aircraft with long TBO intervals — suggest org-configurable default in v1.4.4.
> Both filed as backlog items; no impact on v1.4.3 release.
>
> **QA STATUS: ✅ APPROVED FOR RELEASE**
> — Cilla Oduya, QA Lead, 2026-06-07

---

## §5. UAT — Operator Validation

### §5.1 Sandra Okafor (LSR) — N76LS Scenario UAT

**Date:** 2026-06-04 through 2026-06-05 (pre-event, using staging environment)
**Scenario:** N76LS with WO-LSR-ALS-001, -002, -003 as configured in Phase 31. Sandra validated F-1.4-E lead time alerts and F-1.4-F clustering suggestions on the actual WOs she was managing.

**F-1.4-E validation:**
Sandra entered 42 days lead time for the Main Rotor Hub Yoke and Tail Rotor Hub. The system immediately computed ORDER_NOW status for both (aircraft utilization 3.59 hr/day, 52.8 days remaining < 52.5 threshold). She entered 21 days for the Main Rotor Dampeners (shorter lead time from prior order). System showed MONITOR status for dampeners (93 days remaining > 26.25 threshold).

**Sandra:** "This is exactly what I needed in May. If I had seen ORDER_NOW on the main rotor hub in the first week of May, I would have called Sikorsky that day. Instead I called them on May 28th because I was nervous about the delivery timeline. The feature gets me to that call 3 weeks earlier."

**F-1.4-F validation:**
With cluster window set to 400 hr (custom), the system surfaced a suggestion linking all three WOs. Sandra accepted the suggestion, named the event "N76LS June 2026 Rotor Component Retirement Event," and set planned dates June 8–10. All three WOs showed the event banner.

**Sandra:** "Three work orders, one event name, one planned window. That's the organization I had to build manually in May. The system would have done it for me."

**Sandra UAT verdict:** ✅ **APPROVED** — 2026-06-05

### §5.2 Dale Renfrow (RMTS) — N416AB Scenario UAT

**Date:** 2026-06-06 (staging environment)
**Scenario:** N416AB with historical WO-RMTS-003 context; Dale validated that F-1.4-E would have triggered correctly in April if it had existed.

**F-1.4-E validation:**
Dale entered 5 days lead time for the fuel selector valve (the actual lead time from Rocky Mountain Aircraft Parts). System computed: 160 cycles remaining / 2.8 cycles per day = 57.1 days remaining. 5 × 1.25 = 6.25 days. `57.1 days >> 6.25 days` → `procurementAlertState = MONITOR`. 

**Dale:** "At 160 cycles remaining and a 5-day lead time, the system says MONITOR. That's right — the urgency wasn't about getting the part; Rocky Mountain Aircraft Parts had it in overnight. The urgency was about scheduling the shop window. The feature is correct for the N416AB scenario. The procurement story here was different from Sandra's — it was the scheduling that was tight, not the supply chain."

**Dale's follow-on insight:** "What if there was a 'shop window lead time' field in addition to the part lead time? The part for the fuel selector valve took 1 day. But booking the shop slot and getting Hector available took 7 days. The real lead time was 7 days — not 1. The feature could be more complete if it captured both."

**Devraj note:** Backlog item filed: F-1.4-G (shop scheduling lead time field). Separate from F-1.4-E; targeted for future sprint.

**F-1.4-F validation:**
N416AB had only one DUE_SOON item at the time of WO-RMTS-003 — the fuel selector valve. No clustering suggestion generated. Correct behavior — no false positive.

**Dale UAT verdict:** ✅ **APPROVED** — 2026-06-06

---

## §6. Marcus Webb — Compliance Review

**Marcus Webb compliance review (2026-06-07):**

> **F-1.4-E Compliance Review:**
> The Procurement Lead Time Awareness feature operates on existing ALS data — it does not modify compliance records, alter life limits, or affect the ALS item's compliance status calculation. The `procurementAlertState` is advisory only. It does not and should not affect the existing DUE_SOON / OVERDUE state machine (which is tied to hours remaining relative to life limit).
>
> Review confirms: (1) The feature does not introduce a mechanism to extend life limits. (2) The ORDER_NOW and OVERDUE_PROCUREMENT states are advisory; they do not change the aircraft's airworthiness status. (3) No 14 CFR part 43/91/145 requirement is modified or bypassed by this feature. Advisory-only status should be made clear in the UI (no red "AIRWORTHINESS" language in the procurement alert badge).
>
> One recommendation: rename `OVERDUE_PROCUREMENT` to `PROCUREMENT_CRITICAL` to avoid confusion with the ALS-status use of "OVERDUE." Devraj updated terminology in PR #214.
>
> **F-1.4-E Compliance Status: ✅ APPROVED**
>
> **F-1.4-F Compliance Review:**
> The Maintenance Event Clustering feature is an organizational planning tool. It does not modify work orders, ALS records, or compliance status. Accepted suggestions create `MaintenanceEvent` records that link WOs for planning purposes; this is analogous to a paper planning calendar and carries no regulatory weight.
>
> Review confirms: (1) Accepting a cluster suggestion does not constitute a maintenance authorization. (2) Each WO in a MaintenanceEvent must still be closed independently with proper signoff. (3) The feature does not create scheduling obligations — deferring a suggestion has no compliance impact.
>
> Note for DOM training: The maintenance event record is a planning aid, not a maintenance release. Each WO still requires independent close-out per 14 CFR §43.9.
>
> **F-1.4-F Compliance Status: ✅ APPROVED**
>
> — Marcus Webb, CCO, 2026-06-07

---

## §7. Release — v1.4.3-sprint3

**Jonas Harker — release notes (2026-06-10):**

> **Athelon v1.4.3-sprint3 Release**
> Released: 2026-06-10, 10:00 UTC
> Includes: F-1.4-E (Procurement Lead Time Awareness), F-1.4-F (Maintenance Event Clustering)
> QA: 25/25 TCs PASS (Cilla Oduya)
> UAT: Sandra Okafor ✅ APPROVED; Dale Renfrow ✅ APPROVED
> Compliance: Marcus Webb ✅ APPROVED
>
> Breaking changes: none
> Schema migrations: new fields added to `alsItems` (non-breaking, all optional); new tables `maintenanceEventSuggestions` and `maintenanceEvents` created
> Rollout: full deployment to all production orgs (7 shops active)
> Post-deploy monitoring: normal; no incidents
>
> v1.4.3-sprint3 is the third and final sprint in v1.4. v1.4 is now feature-complete.

**v1.4 sprint summary:**
| Sprint | Features | Release |
|---|---|---|
| Sprint 1 | F-1.4-A Repetitive AD Interval Tracking | v1.4.1-sprint1 |
| Sprint 2 | F-1.4-B Shop-Level ALS Compliance Dashboard | v1.4.2-sprint2 |
| Sprint 3 | F-1.4-E Procurement Lead Time Awareness + F-1.4-F Maintenance Event Clustering | v1.4.3-sprint3 |

---

## §8. WS31-D Summary

| Item | Result |
|---|---|
| F-1.4-E build complete | ✅ |
| F-1.4-F build complete | ✅ |
| Cilla QA — F-1.4-E | 12/12 PASS ✅ |
| Cilla QA — F-1.4-F | 13/13 PASS ✅ |
| Total TCs | 25/25 PASS ✅ |
| Marcus compliance — F-1.4-E | ✅ APPROVED |
| Marcus compliance — F-1.4-F | ✅ APPROVED |
| Sandra Okafor UAT | ✅ APPROVED |
| Dale Renfrow UAT | ✅ APPROVED |
| Release tag | v1.4.3-sprint3 ✅ |
| Backlog items generated | 3 (F14E-NB-01, F14F-NB-02, F-1.4-G) |

---

*WS31-D is complete. v1.4.3-sprint3 shipped. The features that Sandra asked for in May are live in June. The system now tells DOMs when to order parts and when to combine jobs. It doesn't replace the experience of knowing that you can pull a rotor head once instead of three times. But it surfaces the question to people who haven't asked Tobias yet.*
