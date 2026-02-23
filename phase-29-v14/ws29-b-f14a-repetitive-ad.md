# WS29-B — Repetitive AD Interval Tracking — F-1.4-A Build
**Feature ID:** F-1.4-A
**Sprint:** v1.4 Sprint 1 (anchor feature)
**Closes:** CC-27-02 (product gap; scheduled in Phase 28 WS28-E)
**Owners:** Devraj Anand (engineering), Marcus Webb (compliance), Cilla Oduya (QA)
**Status:** ✅ DONE
**Date:** 2026-04-14 through 2026-04-16

---

## §1. Background and Regulatory Basis

### §1.1 The Gap

The gap was documented in WS28-E. The Athelon `adComplianceRecords` table tracks AD applicability and compliance disposition — whether a given AD applies to an aircraft and whether the operator has complied. What it did not do — until this build — is automatically compute the next due date or hours for a repetitive inspection AD, monitor the approach to that interval, or alert the DOM when an interval is approaching or has passed.

This is not a minor gap. The 14 CFR Part 39 compliance universe contains hundreds of repetitive inspection ADs. For turbine-powered aircraft — the fleet Athelon is now reaching with DST (B200), Lone Star (S-76C), and Rocky Mountain Turbine Service (208 Caravan and B200) — repetitive ADs are a primary compliance obligation, not an edge case. Engine hot section ADs, compressor turbine rotor inspection ADs, fuel nozzle checks — these recur at intervals measured in flight hours, and missing them is the difference between airworthy and not.

The materialized proof case: Desert Sky Turbine's N9944P, AD 2020-07-12, compressor turbine rotor FPI — 447-hour overrun before the data entry session caught it. The overrun happened in a system where the DOM trusted a spreadsheet and the spreadsheet's interval column hadn't been updated after the last compliance entry. WO-DST-FPI-001 was opened and N9944P was returned to service. But the gap that allowed it exists across the fleet, and it will happen again — at a different shop, with a different AD — until the interval tracking is automated.

F-1.4-A is the automated fix.

### §1.2 Regulatory Basis (Marcus Webb confirmation)

**Marcus Webb — Compliance Basis Statement (filed 2026-04-14):**

The FAA's authority for Airworthiness Directives derives from 14 CFR Part 39. An AD is a mandatory regulation. If an AD specifies a repetitive inspection interval — e.g., "inspect every 100 hours" — the operator is required to comply at each interval. Failure to comply renders the aircraft unairworthy under 14 CFR §39.7.

The Athelon system's role in the operator's AD compliance program is advisory display. The system does not determine AD applicability — that is the DOM's and IA's responsibility under 14 CFR Part 43. The system does not constitute an approved AD compliance program. What the system does is faithfully display the compliance status of each AD, based on data the DOM or IA enters, and alert the DOM when a repetitive interval is approaching or past due.

Critical point on UI language: the system must not represent itself as the compliance authority. The display must state, clearly: "Based on entered compliance data, this AD's next inspection is due at [X hours] / by [Y date]." The phrase "based on entered compliance data" is mandatory. The DOM's independent compliance determination remains primary. Athelon is a display and alerting layer, not a substitute for the operator's required AD compliance program.

This basis is unchanged from the compliance philosophy stated in the original `adComplianceRecords` design (Phase 26). F-1.4-A extends the display with interval computation and alerting. It does not change the fundamental advisory character of the compliance surface.

**Marcus Webb — Regulatory Basis Confirmed ✅**
*2026-04-14*

---

## §2. Engineering Specification — Devraj Anand

### §2.1 Schema Design

**Base table:** `adComplianceRecords` (existing)
**Extension:** New fields added to existing records. Existing records backfilled with `isRepetitive: false`.

```typescript
// convex/schema.ts — adComplianceRecords table extension for F-1.4-A

export const adComplianceRecords = defineTable({
  // --- EXISTING FIELDS (unchanged) ---
  aircraftId:             v.id("aircraft"),
  adNumber:               v.string(),          // e.g. "2020-07-12"
  adTitle:                v.string(),
  applicability:          v.string(),           // e.g. "PT6A-60A installed engines"
  complianceStatus:       v.union(
                            v.literal("COMPLIANT"),
                            v.literal("NONCOMPLIANT"),
                            v.literal("NOT_APPLICABLE"),
                            v.literal("DEFERRED_WITH_ADSEP"),
                            v.literal("REPETITIVE_APPROACHING"),   // NEW
                          ),
  complianceMethod:       v.optional(v.string()),
  woId:                   v.optional(v.id("workOrders")),
  notes:                  v.optional(v.string()),
  enteredBy:              v.id("users"),
  enteredAt:              v.number(),           // Unix ms

  // --- NEW FIELDS: F-1.4-A repetitive interval tracking ---
  isRepetitive:                     v.boolean(),
  repetitiveIntervalHours:          v.optional(v.number()),   // hours between inspections
  repetitiveIntervalDays:           v.optional(v.number()),   // calendar days between inspections
  lastComplianceHours:              v.optional(v.number()),   // aircraft TT at last compliance
  lastComplianceDate:               v.optional(v.string()),   // ISO date string
  nextDueHours:                     v.optional(v.number()),   // computed: lastComplianceHours + repetitiveIntervalHours
  nextDueDate:                      v.optional(v.string()),   // computed: lastComplianceDate + repetitiveIntervalDays
  repetitiveAlertThresholdHours:    v.optional(v.number()),   // default: 50 hr before due
  repetitiveAlertThresholdDays:     v.optional(v.number()),   // default: 60 days before due
  repetitiveNote:                   v.optional(v.string()),   // DOM-facing interval context note
})
.index("by_aircraft", ["aircraftId"])
.index("by_aircraft_ad", ["aircraftId", "adNumber"])
.index("by_status", ["complianceStatus"]);
```

**Design rationale (Devraj):**

- `isRepetitive` is the root field. All new repetitive logic gates on `isRepetitive === true`. Existing records are backfilled with `isRepetitive: false`, ensuring zero regression on existing compliance records.
- `nextDueHours` and `nextDueDate` are computed fields — not stored raw. They are derived on write via `updateAdCompliance` mutation and stored for fast read. The alternative (computing on read) was rejected because query-time computation for fleet-level dashboard rendering creates O(n) query overhead per aircraft per render. Pre-computing on write is correct for a DOM dashboard that renders on every session load.
- Both hour-based and day-based intervals are supported. Some ADs specify hour intervals (most engine ADs), some specify calendar intervals (some structural ADs), some specify both with a "whichever comes first" requirement. The schema supports all three cases. When both `repetitiveIntervalHours` and `repetitiveIntervalDays` are present, both `nextDueHours` and `nextDueDate` are computed, and the earlier of the two governs the `complianceStatus` state machine.
- `repetitiveAlertThresholdHours` defaults to 50 hours. This means: 50 flight hours before the next due point, the record transitions from COMPLIANT → REPETITIVE_APPROACHING. The DOM can set a custom threshold per AD record (e.g., for an AD on a low-utilization aircraft, 25 hours may be more appropriate than 50). Default is stored in system config, overridable per record.

### §2.2 State Machine Extension

**Existing states:** COMPLIANT | NONCOMPLIANT | NOT_APPLICABLE | DEFERRED_WITH_ADSEP

**New state:** REPETITIVE_APPROACHING

**State machine logic (on aircraft hours update trigger):**

```typescript
// convex/adCompliance.ts — state machine logic

function computeRepetitiveStatus(
  record: AdComplianceRecord,
  currentAircraftHours: number,
  currentDate: string,
): AdComplianceStatus {

  if (!record.isRepetitive) return record.complianceStatus;

  const alertHours = record.repetitiveAlertThresholdHours ?? 50;
  const alertDays  = record.repetitiveAlertThresholdDays  ?? 60;

  // Hour-based check
  if (record.nextDueHours !== undefined) {
    if (currentAircraftHours >= record.nextDueHours) {
      return "NONCOMPLIANT";
    }
    if (currentAircraftHours >= record.nextDueHours - alertHours) {
      return "REPETITIVE_APPROACHING";
    }
  }

  // Day-based check (whichever-comes-first: also check even if hour check was COMPLIANT)
  if (record.nextDueDate !== undefined) {
    const today       = new Date(currentDate);
    const dueDate     = new Date(record.nextDueDate);
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 0) {
      return "NONCOMPLIANT";
    }
    if (daysUntilDue <= alertDays) {
      return "REPETITIVE_APPROACHING";
    }
  }

  return "COMPLIANT";
}
```

**Trigger points:**
1. Any time `updateAircraftHours` mutation runs (WO closure, manual hours update)
2. Daily cron job (00:00 UTC) — re-evaluates all REPETITIVE_APPROACHING and COMPLIANT repetitive records for calendar-interval ADs

### §2.3 Alert Types

**New alert types added to `alertQueue` table:**

```typescript
type: v.union(
  // ... existing types ...
  v.literal("AD_REPETITIVE_APPROACHING"),   // amber — approaching interval
  v.literal("AD_REPETITIVE_NONCOMPLIANT"),  // red   — interval exceeded
)
```

**Alert payloads:**

```typescript
// AD_REPETITIVE_APPROACHING
{
  type: "AD_REPETITIVE_APPROACHING",
  severity: "AMBER",
  aircraftId: string,
  adNumber: string,
  adTitle: string,
  nextDueHours: number | undefined,
  nextDueDate: string | undefined,
  currentAircraftHours: number,
  hoursUntilDue: number | undefined,
  daysUntilDue: number | undefined,
  displayText: "Based on entered compliance data, AD [adNumber] ([adTitle]) next inspection due at [nextDueHours] hr / [nextDueDate]. Current: [currentHours] hr.",
}

// AD_REPETITIVE_NONCOMPLIANT
{
  type: "AD_REPETITIVE_NONCOMPLIANT",
  severity: "RED",
  aircraftId: string,
  adNumber: string,
  adTitle: string,
  nextDueHours: number | undefined,
  nextDueDate: string | undefined,
  currentAircraftHours: number,
  hoursOverdue: number | undefined,
  daysOverdue: number | undefined,
  displayText: "Based on entered compliance data, AD [adNumber] ([adTitle]) inspection interval exceeded. Due: [nextDueHours] hr / [nextDueDate]. Current: [currentHours] hr.",
}
```

**Note on display text language (Marcus sign-off required):** The phrase "based on entered compliance data" is mandatory in all alert display text. This is the UI language approval condition from §1.2. Marcus reviewed and approved the exact display text strings above on 2026-04-15. No variation from this language without a new Marcus sign-off.

### §2.4 `updateAdCompliance` Mutation — Full Specification

```typescript
// convex/adCompliance.ts

export const updateAdCompliance = mutation({
  args: {
    recordId:                      v.id("adComplianceRecords"),
    complianceStatus:              v.optional(v.union(/* all status literals */)),
    isRepetitive:                  v.optional(v.boolean()),
    repetitiveIntervalHours:       v.optional(v.number()),
    repetitiveIntervalDays:        v.optional(v.number()),
    lastComplianceHours:           v.optional(v.number()),
    lastComplianceDate:            v.optional(v.string()),
    repetitiveAlertThresholdHours: v.optional(v.number()),
    repetitiveAlertThresholdDays:  v.optional(v.number()),
    repetitiveNote:                v.optional(v.string()),
    woId:                          v.optional(v.id("workOrders")),
    notes:                         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.recordId);
    if (!existing) throw new Error("AD compliance record not found");

    // Compute nextDue fields if repetitive
    let nextDueHours: number | undefined = undefined;
    let nextDueDate: string | undefined  = undefined;

    const isRep = args.isRepetitive ?? existing.isRepetitive;
    const intHr = args.repetitiveIntervalHours ?? existing.repetitiveIntervalHours;
    const intDy = args.repetitiveIntervalDays ?? existing.repetitiveIntervalDays;
    const lastHr = args.lastComplianceHours ?? existing.lastComplianceHours;
    const lastDt = args.lastComplianceDate ?? existing.lastComplianceDate;

    if (isRep) {
      if (intHr !== undefined && lastHr !== undefined) {
        nextDueHours = lastHr + intHr;
      }
      if (intDy !== undefined && lastDt !== undefined) {
        const last = new Date(lastDt);
        last.setDate(last.getDate() + intDy);
        nextDueDate = last.toISOString().split("T")[0];
      }
    }

    // Fetch current aircraft hours for state machine evaluation
    const aircraft = await ctx.db.get(existing.aircraftId);
    const currentHours = aircraft?.totalTimeHours ?? 0;
    const currentDate = new Date().toISOString().split("T")[0];

    // Recompute status
    const updatedRecord = {
      ...existing,
      ...args,
      nextDueHours,
      nextDueDate,
    };
    const newStatus = computeRepetitiveStatus(updatedRecord, currentHours, currentDate);

    await ctx.db.patch(args.recordId, {
      ...args,
      nextDueHours,
      nextDueDate,
      complianceStatus: newStatus,
    });

    // Fire or dismiss alerts
    await syncRepetitiveAlerts(ctx, args.recordId, newStatus, updatedRecord, aircraft);

    return { recordId: args.recordId, newStatus, nextDueHours, nextDueDate };
  },
});
```

### §2.5 Fleet Sweep Mutation (Cron Trigger)

```typescript
// convex/adCompliance.ts

export const sweepRepetitiveAdIntervals = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all repetitive AD records that are COMPLIANT or REPETITIVE_APPROACHING
    const candidates = await ctx.db
      .query("adComplianceRecords")
      .filter(q =>
        q.and(
          q.eq(q.field("isRepetitive"), true),
          q.or(
            q.eq(q.field("complianceStatus"), "COMPLIANT"),
            q.eq(q.field("complianceStatus"), "REPETITIVE_APPROACHING"),
          )
        )
      )
      .collect();

    const currentDate = new Date().toISOString().split("T")[0];
    let updated = 0;

    for (const record of candidates) {
      const aircraft = await ctx.db.get(record.aircraftId);
      if (!aircraft) continue;

      const newStatus = computeRepetitiveStatus(
        record,
        aircraft.totalTimeHours ?? 0,
        currentDate,
      );

      if (newStatus !== record.complianceStatus) {
        await ctx.db.patch(record._id, { complianceStatus: newStatus });
        await syncRepetitiveAlerts(ctx, record._id, newStatus, record, aircraft);
        updated++;
      }
    }

    return { swept: candidates.length, updated };
  },
});
```

Cron schedule: registered in `convex/crons.ts` as daily at 00:00 UTC.

### §2.6 UI Components

**DOM Dashboard — Repetitive AD Panel:**

New panel on the DOM dashboard: "Repetitive AD Intervals." Visible only if at least one aircraft in the org has at least one repetitive AD record.

Panel structure:
- Section: "NONCOMPLIANT (Past Due)" — RED — lists all aircraft + ADs in NONCOMPLIANT state, sorted by hours overdue descending.
- Section: "APPROACHING" — AMBER — lists all aircraft + ADs in REPETITIVE_APPROACHING state, sorted by hours-until-due ascending.
- Section: "COMPLIANT" — collapsed by default; expandable — all repetitive ADs in COMPLIANT state.

Each row in the panel:
```
[Aircraft tail] [AD number] [AD title]
Due: [nextDueHours] hr / [nextDueDate]
Current: [currentAircraftHours] hr
[Hours until due / hours overdue]
[Open WO button — links to create a WO pre-tagged with this AD]
```

**Per-AD Interval Visualization (in the aircraft compliance detail view):**

For each repetitive AD record, a timeline bar shows:
```
[Last compliance ●──────────────────────── Next due ●]
                        ↑ Now
              [Alert threshold: 50 hr before →|←]
```

The "Now" marker is computed from aircraft current hours. The alert threshold band is shaded amber. Past the "Next due" marker turns red.

**DOM Data Entry — Repetitive AD Toggle:**

In the AD record edit form, a new toggle: "This AD has a repetitive inspection requirement." When toggled on, additional fields appear:
- Interval (hours): [number input]
- Interval (calendar days): [number input] — optional; labeled "If calendar interval also applies (whichever comes first)"
- Last compliance hours: [number input]
- Last compliance date: [date picker]
- Alert threshold hours: [number input, default 50]
- Alert threshold days: [number input, default 60]
- Notes on interval: [text area — Marcus-required label: "Use this field to note the specific AD paragraph that specifies this interval and any environmental or operational qualifications."]

**Marcus UI Language Approval:**
All display text reviewed and approved 2026-04-15. Required language "Based on entered compliance data" present in all alert displays, dashboard panel headers, and per-AD timeline views. No occurrence of language that implies Athelon is the compliance determination authority.

---

## §3. Implementation Log

### §3.1 Day 1 — 2026-04-14 (Devraj)

- Schema extension written. Migration script drafted: backfill `isRepetitive: false` on all existing `adComplianceRecords`.
- `computeRepetitiveStatus` function implemented and unit-tested locally (12 unit tests covering edge cases: both interval types, single type, zero hours remaining, one hour remaining, at-due, one hour past due, calendar-only, hours-only, both-whichever-first).
- `updateAdCompliance` mutation extended with repetitive fields and recomputed-status logic.
- Migration script validated in Convex dev environment. Ran against full existing record set. 0 records with `isRepetitive: true` pre-migration (expected). All existing records patched with `isRepetitive: false`. No existing compliance status values changed. Migration time: 0.4 seconds for 847 existing records.

**Devraj note (end of Day 1):** "The schema is clean. The state machine logic is straightforward. The day-based interval computation edge case is 'what if the aircraft has a calendar interval but no current-hours trigger?' — handled by the daily cron. The daily sweep is required for calendar-only ADs because aircraft hours alone won't trigger the status update."

### §3.2 Day 2 — 2026-04-15 (Devraj)

- Alert system extended with `AD_REPETITIVE_APPROACHING` and `AD_REPETITIVE_NONCOMPLIANT` types.
- `syncRepetitiveAlerts` internal mutation implemented:
  - On transition to REPETITIVE_APPROACHING: fire AMBER alert, dismiss any existing RED alert for same aircraft + AD.
  - On transition to NONCOMPLIANT: fire RED alert, dismiss AMBER alert.
  - On transition to COMPLIANT: dismiss both AMBER and RED alerts for same aircraft + AD.
  - Idempotent: if alert already exists at same severity, no duplicate.
- Fleet sweep cron job implemented and registered.
- DOM dashboard repetitive AD panel UI implemented (React + Convex `useQuery`).
- Per-AD interval visualization timeline bar implemented.
- DOM data entry toggle and supporting form fields implemented.

**Devraj note:** "Alert deduplication took the longest to get right. The edge case is: aircraft is at 'approaching' for hours-based interval, then calendar-based interval also hits approaching — only one amber alert should fire. I'm keying the alert by (aircraftId, adNumber, alertType) so the upsert logic handles it."

### §3.3 Day 3 — 2026-04-16 (Devraj)

- End-to-end integration with `updateAircraftHours` mutation. When a WO closes and hours update, the system now runs `sweepRepetitiveAdIntervals` for the affected aircraft synchronously (not just on cron). This ensures a WO closure that pushes an aircraft past a repetitive AD due point immediately triggers the NONCOMPLIANT state and RED alert — it does not wait until midnight.
- Per-aircraft sweep on WO closure: `afterWoClosure` internal action calls `sweepAircraftRepetitiveAds(aircraftId)` — scoped version of the full sweep, runs only for the one aircraft.
- Full integration test with Marcus UI review completed 2026-04-16 15:00.
- Cilla regression suite initiated 2026-04-16 16:00 (see §4).

---

## §4. QA Execution — Cilla Oduya

### §4.1 Regression on Existing AD Compliance Suite

**Cilla's mandatory first step: PASS all existing test cases before running new ones.**

Existing AD compliance test suite: 34 test cases across 6 categories (applicability, disposition, DEFERRED_WITH_ADSEP, WO linkage, export formatting, multi-aircraft roll-up).

```
REGRESSION RUN — 2026-04-16 16:00 UTC
Suite: AD Compliance — Existing (34 TCs)

TC-AD-001 ... PASS  [AD applicability: single aircraft, applicable]
TC-AD-002 ... PASS  [AD applicability: single aircraft, not applicable]
TC-AD-003 ... PASS  [AD applicability: multi-aircraft fleet roll-up]
TC-AD-004 ... PASS  [Compliance status: COMPLIANT entry via WO]
TC-AD-005 ... PASS  [Compliance status: NONCOMPLIANT flag]
TC-AD-006 ... PASS  [Compliance status: NOT_APPLICABLE]
TC-AD-007 ... PASS  [Compliance status: DEFERRED_WITH_ADSEP]
TC-AD-008 ... PASS  [DEFERRED_WITH_ADSEP: ADSEP expiry warning]
TC-AD-009 ... PASS  [WO linkage: AD tagged to WO, WO closed, status updates]
TC-AD-010 ... PASS  [WO linkage: AD tagged to WO, WO reopened, status reverts]
TC-AD-011 ... PASS  [Historical entry: compliance date in past, status COMPLIANT]
TC-AD-012 ... PASS  [Historical entry: AD number format validation]
TC-AD-013 ... PASS  [DOM dashboard: NONCOMPLIANT ADs visible in alert panel]
TC-AD-014 ... PASS  [DOM dashboard: multi-aircraft NONCOMPLIANT roll-up]
TC-AD-015 ... PASS  [Export: AD compliance record PDF export]
TC-AD-016 ... PASS  [Export: FSDO audit export — AD section]
TC-AD-017 ... PASS  [Existing record migration: isRepetitive backfilled false]
TC-AD-018 ... PASS  [Existing record: complianceStatus unchanged by migration]
TC-AD-019 ... PASS  [Existing record: no nextDueHours or nextDueDate populated]
TC-AD-020 ... PASS  [Alert: existing NONCOMPLIANT alert still fires post-migration]
TC-AD-021 ... PASS  [Alert: existing alert dismiss on WO closure still works]
TC-AD-022 ... PASS  [ALS integration: AD compliance record in ALS context]
TC-AD-023 ... PASS  [Part 135 MEL integration: AD not duplicating MEL items]
TC-AD-024 ... PASS  [Multi-org: AD records isolated per org]
TC-AD-025 ... PASS  [User roles: A&P can enter, DOM can approve, read-only correct]
TC-AD-026 ... PASS  [Pagination: AD list >50 items renders correctly]
TC-AD-027 ... PASS  [Search: AD number search, partial match]
TC-AD-028 ... PASS  [Sort: AD list sort by status, by AD number, by aircraft]
TC-AD-029 ... PASS  [Concurrent edit: two users editing same record — last write wins, no crash]
TC-AD-030 ... PASS  [Edge: AD number with leading zero]
TC-AD-031 ... PASS  [Edge: AD applicability string >500 characters]
TC-AD-032 ... PASS  [Edge: WO with zero ADs tagged — no crash]
TC-AD-033 ... PASS  [Offline: AD record created offline, syncs correctly]
TC-AD-034 ... PASS  [Delete: AD record deletion removes associated alert]

REGRESSION RESULT: 34/34 PASS ✅
```

**Cilla (post-regression):** "Clean. No regressions. The backfill migration is invisible to existing records exactly as intended. Moving to new test cases."

### §4.2 New Test Cases — Repetitive AD Interval Tracking

```
NEW TEST RUN — 2026-04-16 17:00 UTC
Suite: Repetitive AD Interval Tracking — F-1.4-A (28 TCs)

--- Data Entry ---
TC-REP-001 ... PASS  [Toggle: isRepetitive toggle ON shows interval fields]
TC-REP-002 ... PASS  [Toggle: isRepetitive toggle OFF hides interval fields, clears values]
TC-REP-003 ... PASS  [Entry: hour interval only — nextDueHours computed correctly]
TC-REP-004 ... PASS  [Entry: calendar interval only — nextDueDate computed correctly]
TC-REP-005 ... PASS  [Entry: both intervals — both nextDueHours and nextDueDate computed]
TC-REP-006 ... PASS  [Entry: alert threshold custom override — respected in computation]
TC-REP-007 ... PASS  [Entry: repetitiveNote field saved and displayed]
TC-REP-008 ... PASS  [Validation: interval hours < 1 — rejected with error]
TC-REP-009 ... PASS  [Validation: lastComplianceHours required when interval provided — enforced]

--- State Machine ---
TC-REP-010 ... PASS  [State: COMPLIANT when current hours < (nextDue - threshold)]
TC-REP-011 ... PASS  [State: REPETITIVE_APPROACHING when within threshold hours of nextDue]
TC-REP-012 ... PASS  [State: NONCOMPLIANT when current hours >= nextDueHours]
TC-REP-013 ... PASS  [State: calendar-only APPROACHING within 60 days of nextDueDate]
TC-REP-014 ... PASS  [State: calendar-only NONCOMPLIANT when past nextDueDate]
TC-REP-015 ... PASS  [State: hours COMPLIANT but calendar APPROACHING — reports APPROACHING]
TC-REP-016 ... PASS  [State: hours APPROACHING but calendar COMPLIANT — reports APPROACHING]
TC-REP-017 ... PASS  [State: hours NONCOMPLIANT takes precedence regardless of calendar]
TC-REP-018 ... PASS  [State: compliance re-entered (WO closed) — status resets to COMPLIANT]
TC-REP-019 ... PASS  [State: nextDue recomputed from new lastComplianceHours on re-entry]

--- Alerts ---
TC-REP-020 ... PASS  [Alert: AMBER fires on transition to REPETITIVE_APPROACHING]
TC-REP-021 ... PASS  [Alert: RED fires on transition to NONCOMPLIANT]
TC-REP-022 ... PASS  [Alert: AMBER dismissed when RED fires — no duplicate alerts]
TC-REP-023 ... PASS  [Alert: both alerts dismissed on compliance re-entry (COMPLIANT)]
TC-REP-024 ... PASS  [Alert: duplicate suppression — same state, no second alert]

--- DOM Dashboard and UI ---
TC-REP-025 ... PASS  [Dashboard: NONCOMPLIANT panel shows overdue repetitive ADs]
TC-REP-026 ... PASS  [Dashboard: APPROACHING panel shows approaching ADs]
TC-REP-027 ... PASS  [Dashboard: interval timeline bar renders correctly for all states]
TC-REP-028 ... PASS  [Dashboard: "Open WO" button on repetitive AD row pre-tags AD to new WO]

NEW TEST RESULT: 28/28 PASS ✅
```

### §4.3 DST N9944P Scenario Test — Proof Case

**Test case:** TC-DST-N9944P-447 — Simulate the 447-hour overrun scenario that materialized at Desert Sky Turbine.

```
DST N9944P SCENARIO TEST — 2026-04-16 17:45 UTC

Setup:
  Aircraft: N9944P simulation record (test org)
  AD: 2020-07-12 — Compressor Turbine Rotor FPI
  isRepetitive: true
  repetitiveIntervalHours: 600
  lastComplianceHours: 7,200
  nextDueHours (computed): 7,800
  repetitiveAlertThresholdHours: 50 (default)
  Aircraft TT at test start: 7,200

Step 1: Set aircraft TT to 7,749 hr (just outside alert threshold, 51 hr before due)
  Expected: COMPLIANT
  Actual:   COMPLIANT ✅

Step 2: Set aircraft TT to 7,750 hr (exactly at alert threshold, 50 hr before due)
  Expected: REPETITIVE_APPROACHING, AMBER alert fires
  Actual:   REPETITIVE_APPROACHING, AMBER alert fires ✅

Step 3: Set aircraft TT to 7,800 hr (exactly at due point)
  Expected: NONCOMPLIANT, RED alert fires, AMBER dismissed
  Actual:   NONCOMPLIANT, RED alert fires, AMBER dismissed ✅

Step 4: Set aircraft TT to 8,247 hr (simulates 447-hour overrun — the N9944P actual scenario)
  Expected: NONCOMPLIANT, RED alert active, hoursOverdue = 447
  Actual:   NONCOMPLIANT, RED alert active, hoursOverdue = 447 ✅
  Display text confirmed: "Based on entered compliance data, AD 2020-07-12
    (Compressor Turbine Rotor FPI) inspection interval exceeded.
    Due: 7,800 hr. Current: 8,247 hr."

Step 5: Enter compliance (WO closure, lastComplianceHours = 8,247)
  Expected: COMPLIANT, nextDueHours = 8,847, all alerts dismissed
  Actual:   COMPLIANT, nextDueHours = 8,847, all alerts dismissed ✅

DST N9944P SCENARIO: PASS ✅
```

**Cilla:** "The 447-hour overrun is now a scenario the system catches at 50 hours of warning before it could happen. At Desert Sky Turbine, there was no warning at all. This test case is the reason the feature exists."

---

## §5. Marcus Compliance Review — UI Language Approval

**Date:** 2026-04-16 15:00

Marcus reviewed all UI surfaces for F-1.4-A with Devraj and Cilla.

**Checked items:**

1. **Alert display text (both types):** ✅ "Based on entered compliance data" present in all alert displayText strings.
2. **Dashboard panel header:** ✅ Panel labeled "Repetitive AD Intervals (Based on Entered Data)" — correct.
3. **Per-AD timeline:** ✅ Timeline bar labeled with footnote: "Interval tracking is based on compliance data entered by your DOM or IA. Athelon does not determine AD applicability or compliance authority."
4. **DOM data entry form:** ✅ Interval note field includes placeholder: "Reference the specific AD paragraph specifying this interval and any operational qualifications."
5. **No occurrence of "Athelon confirms compliance" or "Athelon verifies" or "compliance authority":** ✅ Searched all new UI strings. Zero occurrences.

**Marcus sign-off:**

> F-1.4-A's compliance advisory posture is correct. The display accurately represents entered data without substituting for the DOM's independent compliance determination. The "Based on entered compliance data" language is present in all required locations. The footnote on the per-AD timeline is appropriate. The data entry note field will capture interval-specification references that will be useful in an audit context.
>
> One observation that is a recommendation, not a blocker: consider adding a field for "AD paragraph citation" — a short free-text field where the DOM can note the specific paragraph of the AD that mandates this interval. This would support traceability in an audit. Logging as a Phase 30 enhancement request, not a Phase 29 blocker.

**Marcus Webb — Compliance Review: ✅ APPROVED**
*2026-04-16*

---

## §6. Success Criteria — Disposition

| Criterion | Status | Notes |
|---|---|---|
| Schema additions implemented; migration run; existing records backfilled `isRepetitive: false` | ✅ DONE | 0 regressions; migration time 0.4s on 847 records |
| `updateAdCompliance` mutation handles repetitive interval logic | ✅ DONE | Computes nextDueHours/nextDueDate; triggers state machine |
| Alert types AD_REPETITIVE_APPROACHING + AD_REPETITIVE_NONCOMPLIANT firing correctly | ✅ DONE | Deduplication confirmed; dismiss-on-closure confirmed |
| DOM dashboard repetitive AD panel visible | ✅ DONE | NONCOMPLIANT + APPROACHING sections; Open WO button |
| Per-AD interval visualization UI shipped | ✅ DONE | Timeline bar with alert threshold band |
| Cilla regression on existing AD suite: PASS | ✅ DONE | 34/34 PASS |
| Cilla new interval tracking test cases: PASS | ✅ DONE | 28/28 PASS |
| Marcus compliance review: regulatory basis confirmed, UI language approved | ✅ DONE | Approved 2026-04-16; recommendation logged for P30 |
| DST N9944P scenario test case: PASS (447-hr overrun correctly detected) | ✅ DONE | 447-hr overrun detected; alert NONCOMPLIANT confirmed |

---

## §7. Sign-Offs

**Devraj Anand — Engineering:**
F-1.4-A is implemented and deployed to the v1.4 staging environment. Schema migration clean. State machine covers all interval types. Alert system extended with deduplication. Per-aircraft sweep on WO closure ensures immediate state update without waiting for nightly cron. The DST N9944P scenario test is the clearest statement of what this feature does: it makes the 447-hour overrun visible at 50 hours of warning.

**✅ Devraj Anand — Engineering Sign-Off — WS29-B**
*2026-04-16*

**Marcus Webb — Compliance:**
F-1.4-A closes CC-27-02. The regulatory basis is correct: advisory display based on entered data, not a compliance determination. UI language approved. The feature is ready to ship.

**✅ Marcus Webb — Compliance Sign-Off — WS29-B**
*2026-04-16*

**Cilla Oduya — QA:**
34/34 existing test cases PASS. 28/28 new test cases PASS. DST N9944P scenario PASS. No regressions. The feature is tested, the migrations are clean, and the alert system behaves correctly under all boundary conditions. F-1.4-A is QA-cleared.

**✅ Cilla Oduya — QA Sign-Off — WS29-B**
*2026-04-16*
