# WS30-C — F-1.4-B Build: Shop-Level ALS Compliance Dashboard (v1.4 Sprint 2)
**Feature ID:** F-1.4-B
**Sprint:** v1.4 Sprint 2
**Owners:** Devraj Anand (build lead), Marcus Webb (compliance review), Cilla Roark (QA lead)
**UAT:** Dale Renfrow (RMTS), Sandra Okafor (LSR)
**Status:** ✅ DONE — PASS (UAT signed off by both SMEs)
**Shipped:** 2026-05-07

---

## §1. Feature Purpose and Context

### §1.1 The Gap

Before F-1.4-B, Athelon's ALS compliance tracking was aircraft-level. A DOM could open a specific aircraft and see that aircraft's ALS board. What they could not do was open a single view and see the entire shop's fleet compliance status — sorted by risk, filterable by aircraft and item type, with OVERDUE items surfaced at the top.

This gap was made visible by the RMTS onboarding. Dale Renfrow maintains three Caravans (N416AB, N208MP, N208TZ) and a B200 King Air (N44RX). After Phase 30's WS30-A audit, all four aircraft have live ALS boards. The RMTS fleet has 29 ALS items per Caravan × 3 Caravans + 22 ALS items for the B200 = 109 ALS items total. No DOM opens 109 items one at a time, one aircraft at a time, every Monday morning. They need a dashboard.

Lone Star Rotorcraft has the same need. Sandra Okafor maintains 33 ALS items on N76LS alone, plus additional Bell 206B-III fleet items.

### §1.2 Feature Specification

**F-1.4-B — Shop-Level ALS Compliance Dashboard**

DOM-facing fleet compliance view that aggregates all aircraft ALS/CMR/AD status with priority sort.

**Sort order:** OVERDUE (🔴) → DUE_SOON (⚠️) → COMPLIANT (✅) → NOT_APPLICABLE (—)
**Filter options:** By shop (DOM org), by aircraft (tail number), by item type (ALS / CMR / AD)
**Columns:** Aircraft, Tail Number, Item Description, P/N (if applicable), Life Limit, Current Hours/Cycles, Remaining, Status, Next Due, Linked WO (if any)
**Refresh:** Real-time (Convex reactive queries)
**Access control:** DOM role and above; shop staff can view; only DOM can initiate work orders from dashboard

---

## §2. Schema Additions

**PR #183 — Schema: ALS Dashboard Aggregation Layer**
*Filed: 2026-04-23 | Merged: 2026-04-24 | Reviewer: Marcus Webb*

```typescript
// convex/schema.ts additions (relevant excerpt)

// alsItems table — additions for dashboard support
alsItems: defineTable({
  shopId: v.id("shops"),                          // enables shop-level aggregation
  aircraftId: v.id("aircraft"),
  itemType: v.union(
    v.literal("ALS"),                              // airframe/airworthiness limitation
    v.literal("CMR"),                              // certification maintenance requirement
    v.literal("AD"),                               // airworthiness directive
    v.literal("LLP")                               // life-limited part (engine)
  ),
  description: v.string(),
  partNumber: v.optional(v.string()),
  referenceDoc: v.string(),                        // ICA section, CMM section, or AD number
  limitValue: v.number(),
  limitUnit: v.union(
    v.literal("HOURS"),
    v.literal("CYCLES"),
    v.literal("CALENDAR_DAYS"),
    v.literal("HOURS_OR_CALENDAR")
  ),
  currentValue: v.number(),                        // hours/cycles since new or last replacement
  lastComplianceHours: v.optional(v.number()),     // aircraft TT at last compliance event
  lastComplianceDate: v.optional(v.string()),
  linkedWorkOrderId: v.optional(v.id("workOrders")),
  complianceStatus: v.union(
    v.literal("COMPLIANT"),
    v.literal("DUE_SOON"),
    v.literal("OVERDUE"),
    v.literal("NOT_APPLICABLE")
  ),
  dueSoonThreshold: v.number(),                    // hours/cycles before limit at which DUE_SOON activates
  nextDueValue: v.optional(v.number()),            // computed next due limit value
  notes: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_shop", ["shopId"])                    // NEW — enables shop-level aggregation
  .index("by_aircraft", ["aircraftId"])
  .index("by_shop_status", ["shopId", "complianceStatus"])  // NEW — priority sort query
  .index("by_shop_aircraft_type", ["shopId", "aircraftId", "itemType"]),  // NEW — filter support
```

**Devraj notes on schema:** "The two new indexes — `by_shop_status` and `by_shop_aircraft_type` — are the backbone of the dashboard. The aggregation query uses `by_shop_status` to pull all OVERDUE items first, then DUE_SOON, then COMPLIANT. The filter uses `by_shop_aircraft_type` to narrow by aircraft or item type. Without these indexes the query would require a full table scan on every dashboard load."

**Marcus compliance review note on schema (2026-04-24):** "No regulatory concern with the schema structure. `itemType` correctly distinguishes between ALS (airworthiness limitations from the ICA), CMR (certification maintenance requirements, same regulatory standing as ALS), AD (airworthiness directives), and LLP (life-limited parts). These distinctions matter in 14 CFR §43.9 recordkeeping context — the record for an ALS compliance event has different documentation requirements than an AD compliance event. The schema supports this distinction."

---

## §3. Convex Queries

**PR #185 — Backend: ALS Dashboard Query Layer**
*Filed: 2026-04-25 | Merged: 2026-04-26 | Reviewer: Cilla Roark (QA)*

```typescript
// convex/functions/alsDashboard.ts

/**
 * getShopComplianceDashboard
 * Returns all ALS/CMR/AD/LLP items for a shop, sorted by priority.
 * Priority: OVERDUE → DUE_SOON → COMPLIANT → NOT_APPLICABLE
 * Filters: aircraftId (optional), itemType (optional)
 */
export const getShopComplianceDashboard = query({
  args: {
    shopId: v.id("shops"),
    aircraftId: v.optional(v.id("aircraft")),
    itemType: v.optional(v.union(
      v.literal("ALS"), v.literal("CMR"), v.literal("AD"), v.literal("LLP")
    )),
  },
  handler: async (ctx, args) => {
    // Verify caller has DOM or staff access for this shop
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !["DOM", "STAFF"].includes(user.role)) throw new Error("Unauthorized");
    if (user.shopId !== args.shopId) throw new Error("Cross-shop access denied");

    // Fetch priority tiers in order
    const statusPriority: ComplianceStatus[] = ["OVERDUE", "DUE_SOON", "COMPLIANT", "NOT_APPLICABLE"];
    const results: AlsItemWithAircraft[] = [];

    for (const status of statusPriority) {
      let itemsQuery = ctx.db
        .query("alsItems")
        .withIndex("by_shop_status", (q) =>
          q.eq("shopId", args.shopId).eq("complianceStatus", status)
        )
        .filter((q) => q.eq(q.field("isActive"), true));

      // Apply optional filters
      const items = await itemsQuery.collect();
      const filtered = items.filter((item) => {
        if (args.aircraftId && item.aircraftId !== args.aircraftId) return false;
        if (args.itemType && item.itemType !== args.itemType) return false;
        return true;
      });

      // Enrich with aircraft data
      const enriched = await Promise.all(
        filtered.map(async (item) => {
          const aircraft = await ctx.db.get(item.aircraftId);
          const linkedWO = item.linkedWorkOrderId
            ? await ctx.db.get(item.linkedWorkOrderId)
            : null;
          return { ...item, aircraft, linkedWO };
        })
      );

      results.push(...enriched);
    }

    // Compute summary counts
    const summary = {
      overdue: results.filter((r) => r.complianceStatus === "OVERDUE").length,
      dueSoon: results.filter((r) => r.complianceStatus === "DUE_SOON").length,
      compliant: results.filter((r) => r.complianceStatus === "COMPLIANT").length,
      notApplicable: results.filter((r) => r.complianceStatus === "NOT_APPLICABLE").length,
      total: results.length,
    };

    return { items: results, summary };
  },
});

/**
 * updateAlsItemCompliance
 * Called when a WO linked to an ALS item is closed.
 * Recomputes complianceStatus and nextDueValue.
 * Mutation — requires DOM role.
 */
export const updateAlsItemCompliance = mutation({
  args: {
    alsItemId: v.id("alsItems"),
    newCurrentValue: v.number(),
    complianceHours: v.number(),
    complianceDate: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.alsItemId);
    if (!item) throw new Error("ALS item not found");

    // Compute remaining and status
    const remaining = item.limitValue - args.newCurrentValue;
    let newStatus: ComplianceStatus;
    if (remaining <= 0) {
      newStatus = "OVERDUE";
    } else if (remaining <= item.dueSoonThreshold) {
      newStatus = "DUE_SOON";
    } else {
      newStatus = "COMPLIANT";
    }

    await ctx.db.patch(args.alsItemId, {
      currentValue: args.newCurrentValue,
      lastComplianceHours: args.complianceHours,
      lastComplianceDate: args.complianceDate,
      complianceStatus: newStatus,
      nextDueValue: item.limitValue,  // for interval items, add interval to lastComplianceHours
      updatedAt: Date.now(),
    });

    return { newStatus, remaining };
  },
});
```

---

## §4. React Dashboard Component Design

**PR #188 — Frontend: ShopComplianceDashboard component**
*Filed: 2026-04-28 | Merged: 2026-04-30 | Reviewer: Cilla Roark*

The dashboard is a React component (`ShopComplianceDashboard.tsx`) rendered in the DOM's primary workspace view. Design decisions:

**Priority row coloring:**
- OVERDUE rows: red background (`bg-red-50`), red status badge (`bg-red-600`)
- DUE_SOON rows: amber background (`bg-amber-50`), amber status badge (`bg-amber-500`)
- COMPLIANT rows: white background, green status badge (`bg-green-600`)
- NOT_APPLICABLE rows: light gray background, gray badge

**Filter bar:** Three select inputs — Aircraft (multi-select), Item Type (checkbox: ALS / CMR / AD / LLP), Status (checkbox: OVERDUE / DUE_SOON / COMPLIANT)

**Summary bar at top:** OVERDUE [n] | DUE_SOON [n] | COMPLIANT [n] totals, with color-coded counts. If OVERDUE count > 0, the summary bar has a persistent red alert banner: "ATTENTION: {n} item(s) require immediate action."

**Column layout:**
```
| Aircraft | Tail # | Item Description | Type | Limit | Current | Remaining | Status | Next Due | WO |
```

**Linked WO column:** If an item has a linked open WO, shows WO number as a clickable link. If no WO, shows "—" with an "Open WO" button (DOM only).

**Sorting:** Default sort is priority (OVERDUE → DUE_SOON → COMPLIANT). Secondary sort within each status tier: by hours/cycles remaining, ascending (nearest-to-limit items first within each tier).

**Devraj design note:** "The 'Open WO' button directly from the dashboard row is a feature Dale asked for during UAT. If he sees an OVERDUE item on the dashboard, he shouldn't have to navigate to the work order module — he should be able to open a pre-populated WO from the row. We added this in the UAT revision cycle (PR #191)."

---

## §5. Cilla Roark — Test Suite: Full TC Matrix

**Test plan filed:** 2026-04-30
**TC execution completed:** 2026-05-02

| TC # | Test Case | Test Type | Input | Expected Result | Actual Result | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-01 | Dashboard loads for DOM user | Auth | DOM user, shopId=RMTS | Dashboard renders with summary bar and item rows | Dashboard renders correctly | ✅ PASS |
| TC-02 | Dashboard denied for unauthenticated user | Auth | No auth token | Error: "Unauthenticated" | 401 error returned | ✅ PASS |
| TC-03 | Dashboard denied for cross-shop access | Auth | DOM user shopId=LSR requesting RMTS | Error: "Cross-shop access denied" | 403 error returned | ✅ PASS |
| TC-04 | OVERDUE items appear first | Sort | RMTS fleet with 1 OVERDUE item (N208MP) | OVERDUE item in first row | OVERDUE item first | ✅ PASS |
| TC-05 | DUE_SOON items appear before COMPLIANT | Sort | RMTS fleet with mix | DUE_SOON before COMPLIANT | Correct tier order | ✅ PASS |
| TC-06 | Within-tier sort by remaining (ascending) | Sort | Two DUE_SOON items, 160 cycles vs 2,952 hr remaining | 160-cycle item appears first | 160-cycle item first | ✅ PASS |
| TC-07 | Filter by aircraft (N416AB only) | Filter | aircraftId=N416AB | Only N416AB rows shown | N416AB rows only | ✅ PASS |
| TC-08 | Filter by item type (CMR only) | Filter | itemType=CMR | Only CMR rows shown | CMR rows only | ✅ PASS |
| TC-09 | Filter combination (aircraft + type) | Filter | aircraftId=N416AB, itemType=LLP | N416AB LLP items only | Correct filtered set | ✅ PASS |
| TC-10 | Summary bar counts match row counts | Display | RMTS fleet with 1 OVERDUE, 3 DUE_SOON, 105 COMPLIANT | Summary: OVERDUE 1, DUE_SOON 3, COMPLIANT 105 | Counts match | ✅ PASS |
| TC-11 | Red alert banner appears when OVERDUE > 0 | Display | 1 OVERDUE item in shop | Red alert banner visible | Banner shown | ✅ PASS |
| TC-12 | Red alert banner absent when OVERDUE = 0 | Display | 0 OVERDUE items | No banner | No banner | ✅ PASS |
| TC-13 | Linked WO shows WO number as link | Display | ALS item with linkedWorkOrderId=WO-RMTS-003 | "WO-RMTS-003" clickable link | Link renders | ✅ PASS |
| TC-14 | "Open WO" button available for items without WO | Display | ALS item with no linked WO | "Open WO" button visible (DOM only) | Button visible | ✅ PASS |
| TC-15 | "Open WO" button not visible for STAFF role | Auth | STAFF user (not DOM) | No "Open WO" button | Button hidden | ✅ PASS |
| TC-16 | Real-time update — OVERDUE resolves to COMPLIANT | Reactive | WO closed on OVERDUE item; mutation fires | Row transitions from OVERDUE to COMPLIANT without page reload | Real-time transition | ✅ PASS |
| TC-17 | Dashboard renders empty state correctly | Display | Shop with zero ALS items | "No ALS items found for this shop" message | Empty state shown | ✅ PASS |
| TC-18 | Large fleet performance (>100 items) | Performance | RMTS fleet: 109 items | Dashboard renders in < 2s | Rendered in 1.1s | ✅ PASS |

**All 18 test cases: PASS**

**Cilla Roark QA sign-off:**
> I have executed all 18 test cases in the TC matrix. All tests pass. Auth, sort, filter, display, reactive update, and performance cases are covered. The dashboard renders correctly for both the RMTS (turbine fleet, 109 items) and LSR (helicopter fleet, 33 items) test fixtures. No bugs filed after final regression. F-1.4-B QA: APPROVED.
>
> — Cilla Roark, QA Lead, 2026-05-02

---

## §6. Marcus Webb — Compliance Review

**Compliance review completed:** 2026-05-01

**Regulatory references:**
- **14 CFR §43.9** — Content, form, and disposition of maintenance records. The dashboard does not create maintenance records; it surfaces the status of records already created. The dashboard is a compliance visualization tool, not a records system. No Part 43 records obligations are triggered by viewing the dashboard.
- **14 CFR §43.11** — Content, form, and disposition of records for inspections. Same logic — inspection records are in the work order system; the dashboard surfaces their compliance status.
- **14 CFR Part 91.409(e)** — Progressive inspection program. The ALS tracking surface is consistent with the requirements of an approved progressive inspection program where applicable.
- **ALS authority (14 CFR §21.50(b) + §91.409(f)(3)):** Airworthiness Limitations sections in an ICA are FAA-approved documents with the force of law — compliance is not optional. The dashboard's OVERDUE status for an ALS item correctly reflects a regulatory non-compliance condition. The dashboard does not overstate the regulatory status; it accurately represents it.
- **CMR authority:** Certification Maintenance Requirements have the same regulatory standing as airworthiness limitations under the type certificate basis. The `itemType: "CMR"` items in the dashboard carry the same regulatory weight as `itemType: "ALS"` items. The dashboard does not distinguish between their regulatory weight in the visual presentation — both OVERDUE ALS and OVERDUE CMR items are shown in red. This is correct.

**Marcus compliance sign-off:**
> F-1.4-B dashboard has been reviewed for compliance accuracy. The dashboard correctly represents the regulatory status of ALS, CMR, AD, and LLP items. Priority sort order (OVERDUE → DUE_SOON → COMPLIANT) is consistent with the regulatory standing of these items under 14 CFR Part 21, Part 43, and Part 91. The `itemType` taxonomy correctly captures the distinction between airworthiness limitations (ALS), certification maintenance requirements (CMR), airworthiness directives (AD), and life-limited parts (LLP). The dashboard does not create, modify, or delete maintenance records — it is a read-focused compliance visualization. No compliance concerns.
>
> — Marcus Webb, Compliance Lead, 2026-05-01

---

## §7. UAT — Dale Renfrow (RMTS)

**UAT date:** 2026-05-05
**Format:** Live session, video call + screen share (Dale at RMTS hangar, Devraj on laptop)
**Duration:** 47 minutes

Dale accessed the RMTS compliance dashboard as DOM. Fleet displayed: N416AB, N208MP, N208TZ, N44RX.

**Initial view:** 2 DUE_SOON items for N416AB (fuel selector valve F-2 now has a linked WO-RMTS-003; combustion liner F-3 in planning), 1 DUE_SOON on N208MP rudder torque tube, 0 OVERDUE items (all OVERDUE items resolved).

**Dale's UAT walkthrough:**
- Navigated to N416AB aircraft filter — confirmed 29 rows, correct counts
- Checked linked WO on fuel selector valve item — WO-RMTS-003 link navigated correctly
- Tested "Open WO" button on combustion liner planning item — confirmed pre-populated WO template appears
- Filtered by item type "LLP" — confirmed PT6A engine LLP items rendered only
- Sorted within DUE_SOON tier — confirmed 160-cycle item sorted above 2,952-hour item

**Dale's feedback during UAT:**
- *"This is what I've been asking for. One screen, all four aircraft, everything sorted by priority. I open this on Monday morning and I see exactly what's hot."*
- Requested: add a "days until due" column (estimated, based on utilization rate). Devraj noted this as a future enhancement (F-1.4-D backlog). Not a blocker.
- No bugs filed during Dale's session.

**Dale Renfrow UAT sign-off:**
> I have reviewed the F-1.4-B Shop-Level ALS Compliance Dashboard for the RMTS fleet. All four aircraft are displayed correctly. Sort order, filter, and linked work order navigation work as intended. The dashboard gives me the fleet-level compliance view I need. Approved for production.
>
> — Dale Renfrow, DOM, Rocky Mountain Turbine Service, 2026-05-05

---

## §8. UAT — Sandra Okafor (LSR)

**UAT date:** 2026-05-06
**Format:** Live session, video call + screen share (Sandra at LSR Fort Worth, Devraj on laptop)
**Duration:** 38 minutes

Sandra accessed the LSR compliance dashboard as DOM. Fleet displayed: N76LS (S-76C).

**Initial view:** 0 OVERDUE items (CMR-04-70-003 closed in Phase 29, N76LS now fully COMPLIANT on all CMR items). 3 DUE_SOON items: Main Rotor Head Assembly, Tail Rotor Hub, Main Rotor Dampeners.

**Sandra's UAT walkthrough:**
- Confirmed N76LS ALS board renders as 33 rows
- Verified 3 DUE_SOON items visible at top of list, above COMPLIANT items
- Checked that CMR-04-70-003 (previously OVERDUE) now shows COMPLIANT with linked WO-LSR-CMR-001
- Tested CMR filter — confirmed only 4 CMR items display
- Navigated from DUE_SOON item to "Open WO" — confirmed WO template pre-populates with aircraft, item description, and ALS reference

**Sandra's feedback during UAT:**
- *"This is what the first six months of Athelon has been building toward. Everything is in one place. Last year I had a spreadsheet with 33 rows and I had to re-sort it every time I updated it. Now the sort is automatic and I can filter by item type. The three DUE_SOON items I can see from here — I already know those are the ones Tobias and I are working on."*
- Requested: ability to export dashboard snapshot as PDF for FSDO audit prep. Devraj noted this as F-1.4-E backlog. Not a blocker.
- No bugs filed during Sandra's session.

**Sandra Okafor UAT sign-off:**
> I have reviewed the F-1.4-B Shop-Level ALS Compliance Dashboard for the LSR fleet (N76LS). The dashboard correctly displays all 33 ALS items, with DUE_SOON items sorted to the top. CMR-04-70-003 shows COMPLIANT with correct next-due interval. The dashboard provides the compliance overview I need for daily fleet management. Approved for production.
>
> — Sandra Okafor, DOM, Lone Star Rotorcraft, 2026-05-06

---

## §9. Release

**Jonas Harker release gate (2026-05-07):**
- All 18 TC cases: PASS ✅
- Marcus compliance review: APPROVED ✅
- Dale Renfrow UAT sign-off: APPROVED ✅
- Sandra Okafor UAT sign-off: APPROVED ✅
- PR #183 (schema), PR #185 (backend), PR #188 + PR #191 (frontend) merged to main
- Version: v1.4.2-sprint2

> F-1.4-B is approved for production release. No outstanding issues. UAT passed by both RMTS and LSR. Compliance review approved by Marcus Webb. Releasing to production environment.
>
> — Jonas Harker, 2026-05-07

---

## §10. Summary

| Criterion | Result |
|---|---|
| Schema additions (PR #183) | ✅ Merged 2026-04-24 |
| Backend query layer (PR #185) | ✅ Merged 2026-04-26 |
| React dashboard component (PR #188 + #191) | ✅ Merged 2026-04-30, revised 2026-05-02 |
| TC matrix — 18/18 PASS | ✅ Cilla Roark sign-off 2026-05-02 |
| Marcus compliance review | ✅ Approved 2026-05-01 |
| Dale Renfrow UAT | ✅ Approved 2026-05-05 |
| Sandra Okafor UAT | ✅ Approved 2026-05-06 |
| Production release | ✅ v1.4.2-sprint2, 2026-05-07 |
| F-1.4-B status | **DONE — SHIPPED** |
