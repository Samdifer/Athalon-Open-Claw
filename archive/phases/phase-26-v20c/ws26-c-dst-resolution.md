# WS26-C — DST-FB-001 Frank Nguyen Follow-Up + Admin Resolution UI
**Phase:** 26  
**Status:** ✅ DONE  
**Filed:** 2026-02-23T~02:30Z  
**Owners:** Frank Nguyen (Desert Sky Turbine, 24-record review), Devraj Anand (admin resolution UI), Cilla Oduya (regression + new test cases), Marcus Webb (compliance review of resolution protocol)  
**Gate dependency:** None — ran in parallel with WS26-A

---

## Overview

DST-FB-001 shipped in Phase 25. The migration flagged 47 records across 4 organizations with `domReviewFlag: true` — records where the `nonApplicabilityBasis` field was null at the time of migration. Desert Sky Turbine (Frank Nguyen's org, Scottsdale AZ) had 24 of the 47.

Frank committed to reviewing all 24 this week. He has reviewed them. The results are documented below. Devraj has built the admin resolution UI. Cilla has run the full regression and new test cases. Marcus has reviewed the resolution protocol. All 24 records are resolved.

---

## Part I — Frank Nguyen's 24-Record Review

**Reviewer:** Frank Nguyen, DOM — Desert Sky Turbine, Scottsdale AZ  
**Review period:** Phase 26 Week 1–2  
**Method:** Frank pulled each flagged record, reviewed the underlying AD, reviewed Desert Sky Turbine's maintenance records and his own DOM determinations, and categorized each.

Frank's opening note to Nadia (relayed to the team):

> "I expected most of these to be piston ADs. We're a turbine shop. When the prior operator loaded data, they imported from a general aviation database that doesn't filter by engine type. I'm not surprised these got flagged — I'm surprised there weren't more. Let me go through them and I'll tell you what category each one is in."

---

### Summary: 24 Records by Category

| Category | Count | Description |
|---|---|---|
| Category 1 | 16 | Correct NOT_APPLICABLE — basis known, needs documentation |
| Category 2 | 5 | DOM determination — supporting reference needed |
| Category 3 | 3 | Real data gap — no defensible basis; flag for re-inspection |

Total: 24 records reviewed and categorized.

---

### Category 1 — Correct NOT_APPLICABLE: Basis Known (16 records)

These are ADs that genuinely do not apply to Desert Sky Turbine's fleet. The basis is clear: they are piston engine ADs imported from a prior shop's general aviation database. Frank's fleet is turbine — Pratt & Whitney Canada PT6A and PT6C series.

**Common basis:** `NOT_APPLICABLE_BY_MODEL`  
**Correct nonApplicabilityNotes:** "AD applicability: Lycoming/Continental piston engines only. Desert Sky Turbine fleet: Pratt & Whitney Canada PT6A/PT6C turbine engines. No piston aircraft on certificate."

**The 16 records (by AD number):**

| # | AD Number | AD Subject | Frank's Note |
|---|---|---|---|
| 1 | 2019-03-14 | Lycoming IO-360 engine oil system | Lycoming-only. P&WC fleet. |
| 2 | 2019-07-22 | Continental IO-550 cylinder assembly | Continental-only. P&WC fleet. |
| 3 | 2020-01-08 | Lycoming TIO-540 magneto inspection | Lycoming-only. |
| 4 | 2020-04-15 | Continental O-470 exhaust system | Continental-only. |
| 5 | 2020-09-30 | Lycoming IO-360 fuel divider | Lycoming-only. |
| 6 | 2021-02-11 | Lycoming O-540 piston inspection | Lycoming-only. |
| 7 | 2021-06-03 | Continental TSIO-520 turbocharger | Continental TSIO — not PT6. |
| 8 | 2021-09-19 | Lycoming IO-540 crankshaft | Lycoming-only. |
| 9 | 2022-01-24 | Continental IO-520 connecting rod | Continental-only. |
| 10 | 2022-04-07 | Lycoming TIO-360 fuel pump | Lycoming-only. |
| 11 | 2022-08-14 | Continental O-300 ignition | Continental-only. |
| 12 | 2022-11-02 | Lycoming O-320 crankcase | Lycoming-only. |
| 13 | 2023-02-28 | Continental IO-470 carburetor | Continental-only. |
| 14 | 2023-06-15 | Lycoming IO-390 injector inspection | Lycoming-only. |
| 15 | 2023-09-08 | Continental IO-550 cam follower | Continental-only. |
| 16 | 2024-01-17 | Lycoming TIO-540 prop governor | Lycoming-only. |

**Frank's resolution action:** Apply `NOT_APPLICABLE_BY_MODEL` basis to all 16 records. Add standard notes. Clear `domReviewFlag`.

Marcus's review: All 16 are straightforwardly model-specific piston engine ADs. The `NOT_APPLICABLE_BY_MODEL` basis is correct. No compliance concern.

---

### Category 2 — DOM Determination: Supporting Reference Needed (5 records)

These are records where Frank, as DOM, previously made a NOT_APPLICABLE determination — but the supporting reference (DOM memo or AMOC reference) was never attached to the record. The determination is defensible; the documentation is incomplete.

**Correct basis:** `NOT_APPLICABLE_DOM_DETERMINATION`  
**Required action:** Attach DOM memo reference or AMOC reference in `nonApplicabilityNotes`. Create formal memo for each.

| # | AD Number | AD Subject | Frank's Basis for NOT_APPLICABLE | Supporting Document |
|---|---|---|---|---|
| 17 | 2021-14-09 | Beechcraft King Air propeller inspection | Desert Sky Turbine fleet does not include King Air — determination made when prior shop imported mixed-fleet records | DST-MEMO-001 (created WS26-C) |
| 18 | 2022-03-19 | Cessna 208 Caravan airframe inspection | No Caravan on certificate; imported from prior shop | DST-MEMO-002 (created WS26-C) |
| 19 | 2022-10-05 | Piper PA-31 Navajo fuel system | No PA-31 on certificate; prior shop import | DST-MEMO-003 (created WS26-C) |
| 20 | 2023-01-31 | Beechcraft B300 (King Air 350) nacelle inspection | No B300 on certificate; Frank confirmed with FSDO rep during informal review 2023-09 — informal only, no written FSDO determination | DST-MEMO-004 (created WS26-C) |
| 21 | 2023-11-22 | Cessna Citation Excel cabin pressurization | No Citation Excel on certificate; Frank has AMOC reference for a related AD that was withdrawn — documentation in shop files | DST-MEMO-005 + AMOC-DST-001 (created WS26-C) |

**Frank on Category 2:**

> "These are mine. I made the call on each of them — the aircraft aren't on our certificate, the ADs don't apply. But I never wrote it up formally. I've been running this shop for six years and I knew these weren't applicable, so I moved on. Now I'm writing the memos. That's what the system is making me do, and honestly, it should have made me do it then."

Marcus's review: All five determinations are defensible. The memos DST-MEMO-001 through DST-MEMO-005 bring them to a documentable standard. The AMOC reference for record 21 will be attached. No compliance concern — these are administrative documentation gaps, not substantive compliance failures.

---

### Category 3 — Real Data Gap: No Defensible Basis (3 records)

These are records where a NOT_APPLICABLE determination was made by the prior shop before Frank's tenure as DOM at Desert Sky Turbine. Frank cannot locate the basis for the determination, cannot reconstruct it from the maintenance records, and is not willing to put his name on a determination he cannot document.

**Frank's statement:**

> "These three were in the system when I became DOM. I don't know why they were marked not applicable. I can't find any documentation and I can't defend the call. I'm not going to pretend I can. Mark them for re-inspection. I'll figure out what's actually going on with each one and we'll resolve them properly."

**The 3 records:**

| # | AD Number | AD Subject | Issue | Frank's Action |
|---|---|---|---|---|
| 22 | 2020-07-12 | Pratt & Whitney Canada PT6A-series turbine compressor inspection | **This IS a P&WC AD.** Prior shop marked NOT_APPLICABLE — no documented basis. Frank cannot confirm. | MARK_FOR_REINSPECTION |
| 23 | 2021-05-28 | Engine mount fatigue inspection — turboprop operators | Generic turboprop AD. May apply to Desert Sky aircraft. Prior shop NOT_APPLICABLE — no documented basis. | MARK_FOR_REINSPECTION |
| 24 | 2022-09-14 | Fuel control unit inspection — PT6A variants | PT6A-series. Prior shop NOT_APPLICABLE with note "variant not applicable" — variant not specified in note, cannot verify. | MARK_FOR_REINSPECTION |

**Marcus's note on Record 22:** The 2020-07-12 AD is a Pratt & Whitney Canada PT6A-series compressor inspection. Desert Sky Turbine operates PT6A engines. This is a live AD applicability question. Frank is correct to mark it for re-inspection. This record must not be cleared without verification against Desert Sky's specific PT6A variant applicability. Marcus has flagged this as the highest-priority record in the three — it is a potentially applicable AD on an engine type in the fleet, not a routine piston-engine mismatch.

**Frank's plan for Category 3:**
- Record 22: Contact P&WC tech support, get applicability confirmation by serial number. Create WO if required.
- Record 23: Review engine mount records, compare to AD applicability statement by aircraft type.
- Record 24: Identify exact PT6A variant for each Desert Sky aircraft, compare to AD applicability range.

Timeline: Frank committed to resolving all three Category 3 records within 30 days of Phase 26 ship date.

---

## Part II — Devraj Anand: Admin Resolution UI

**Owner:** Devraj Anand  
**Reviewed by:** Marcus Webb (compliance), Cilla Oduya (test cases)  
**Scope:** DOM-only screen. Not visible to A&P mechanics (non-admin role) or viewers.

---

### 2.1 Permission Design

Marcus specified the permission model for the resolution UI:

**Who can access the Flagged Record Review screen:**
- Users with role `admin` or `dom`
- Users with both `view_compliance` AND `close_work_order` permissions

A new permission `dom_compliance_review` is added to the permission set. DOM users receive this permission automatically. Admin users receive it automatically. A&P mechanics (role: `mechanic`) and viewers (role: `viewer`) do not receive it and cannot see the screen.

---

### 2.2 Mutation Implementation

```typescript
// convex/mutations/adCompliance.ts
// Phase 26, WS26-C — Admin Resolution UI
// Author: Devraj Anand
// Reviewed: Marcus Webb, Cilla Oduya

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireDomPermission } from "./auth";

const nonApplicabilityBasisValues = v.union(
  v.literal("NOT_APPLICABLE_BY_MODEL"),
  v.literal("NOT_APPLICABLE_BY_SERIAL_NUMBER"),
  v.literal("NOT_APPLICABLE_DOM_DETERMINATION"),
  v.literal("NOT_APPLICABLE_SUPERSEDED"),
);

export const resolveAdComplianceFlag = mutation({
  args: {
    adComplianceRecordId: v.id("adComplianceRecords"),
    resolution: v.union(
      v.literal("APPLY_BASIS"),
      v.literal("MARK_FOR_REINSPECTION"),
      v.literal("ESCALATE_TO_MEMO"),
    ),
    // Required when resolution = APPLY_BASIS or ESCALATE_TO_MEMO
    nonApplicabilityBasis: v.optional(nonApplicabilityBasisValues),
    nonApplicabilityNotes: v.optional(v.string()),
    // Required when resolution = MARK_FOR_REINSPECTION
    reinspectionReason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    // ── Auth check: DOM-only ──────────────────────────────────────────────
    const user = await requireDomPermission(ctx);
    // requireDomPermission: throws ConvexError if user lacks dom_compliance_review
    // permission. Also extracts orgId from Clerk identity — never from args.

    const { orgId } = user;

    // ── Fetch the record ──────────────────────────────────────────────────
    const record = await ctx.db.get(args.adComplianceRecordId);
    if (!record) {
      throw new ConvexError("AD compliance record not found.");
    }

    // ── Org scope check ───────────────────────────────────────────────────
    if (record.orgId !== orgId) {
      throw new ConvexError("Access denied: record belongs to a different organization.");
    }

    // ── Must be currently flagged ─────────────────────────────────────────
    if (!record.domReviewFlag) {
      throw new ConvexError("Record is not currently flagged for review.");
    }

    const now = new Date().toISOString();

    // ── Resolution branch ─────────────────────────────────────────────────

    if (args.resolution === "APPLY_BASIS") {
      // Validate: basis and notes must be provided
      if (!args.nonApplicabilityBasis) {
        throw new ConvexError("nonApplicabilityBasis is required for APPLY_BASIS resolution.");
      }
      if (!args.nonApplicabilityNotes || args.nonApplicabilityNotes.trim().length < 10) {
        throw new ConvexError(
          "nonApplicabilityNotes must be provided and substantive (min 10 characters) for APPLY_BASIS resolution."
        );
      }

      await ctx.db.patch(args.adComplianceRecordId, {
        nonApplicabilityBasis: args.nonApplicabilityBasis,
        nonApplicabilityNotes: args.nonApplicabilityNotes,
        domReviewFlag: false,
        domReviewClearedAt: now,
        domReviewClearedBy: user.userId,
        updatedAt: now,
      });

      return { resolution: "APPLY_BASIS", cleared: true };
    }

    if (args.resolution === "MARK_FOR_REINSPECTION") {
      // Validate: reason must be provided
      if (!args.reinspectionReason || args.reinspectionReason.trim().length < 10) {
        throw new ConvexError(
          "reinspectionReason must be provided and substantive for MARK_FOR_REINSPECTION."
        );
      }

      // Note: domReviewFlag is NOT cleared on MARK_FOR_REINSPECTION.
      // The flag display changes from "Review Required" to "Re-Inspection Scheduled"
      // via the requiresReinspection field. Both fields remain true until a
      // resolution work order is linked and closed.

      await ctx.db.patch(args.adComplianceRecordId, {
        requiresReinspection: true,
        reinspectionReason: args.reinspectionReason,
        reinspectionScheduledAt: now,
        reinspectionScheduledBy: user.userId,
        // domReviewFlag remains true — intentionally not cleared
        updatedAt: now,
      });

      return { resolution: "MARK_FOR_REINSPECTION", cleared: false, requiresReinspection: true };
    }

    if (args.resolution === "ESCALATE_TO_MEMO") {
      // Creates a DOM memo template record; returns the memo ID for the DOM to complete.
      // The basis is set to NOT_APPLICABLE_DOM_DETERMINATION.
      // The flag is NOT cleared until the memo is completed and submitted.

      if (!args.nonApplicabilityNotes || args.nonApplicabilityNotes.trim().length < 10) {
        throw new ConvexError(
          "nonApplicabilityNotes (memo context) must be provided for ESCALATE_TO_MEMO."
        );
      }

      // Create DOM memo record
      const memoId = await ctx.db.insert("domMemos", {
        orgId,
        adComplianceRecordId: args.adComplianceRecordId,
        adNumber: record.adNumber,
        status: "DRAFT",
        memoContext: args.nonApplicabilityNotes,
        createdAt: now,
        createdBy: user.userId,
        updatedAt: now,
      });

      // Mark the adCompliance record as memo-in-progress (but don't clear flag)
      await ctx.db.patch(args.adComplianceRecordId, {
        domMemoId: memoId,
        domMemoStatus: "IN_PROGRESS",
        updatedAt: now,
      });

      return {
        resolution: "ESCALATE_TO_MEMO",
        cleared: false,
        memoId,
        message: "DOM memo created. Complete and submit the memo to clear this flag.",
      };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// submitDomMemo — completes memo creation and clears the domReviewFlag
// ─────────────────────────────────────────────────────────────────────────────

export const submitDomMemo = mutation({
  args: {
    memoId: v.id("domMemos"),
    memoText: v.string(),          // Full memo text drafted by DOM
    memoReference: v.string(),     // E.g., "DST-MEMO-001" — DOM's own reference system
  },

  handler: async (ctx, args) => {
    const user = await requireDomPermission(ctx);
    const { orgId } = user;

    const memo = await ctx.db.get(args.memoId);
    if (!memo || memo.orgId !== orgId) {
      throw new ConvexError("Memo not found or access denied.");
    }
    if (memo.status !== "DRAFT") {
      throw new ConvexError("Memo is not in DRAFT status.");
    }

    const now = new Date().toISOString();

    // Complete the memo
    await ctx.db.patch(args.memoId, {
      status: "SUBMITTED",
      memoText: args.memoText,
      memoReference: args.memoReference,
      submittedAt: now,
      submittedBy: user.userId,
      updatedAt: now,
    });

    // Clear the flag on the adCompliance record
    await ctx.db.patch(memo.adComplianceRecordId, {
      nonApplicabilityBasis: "NOT_APPLICABLE_DOM_DETERMINATION",
      nonApplicabilityNotes: `${args.memoReference}: ${args.memoText.substring(0, 200)}`,
      domReviewFlag: false,
      domReviewClearedAt: now,
      domReviewClearedBy: user.userId,
      domMemoStatus: "SUBMITTED",
      updatedAt: now,
    });

    return { memoId: args.memoId, cleared: true };
  },
});
```

---

### 2.3 Schema Additions to adComplianceRecords

```typescript
// Additional fields added to adComplianceRecords in Phase 26
// Author: Devraj Anand

// Existing domReviewFlag: v.boolean() — unchanged

// New fields:
domReviewClearedAt: v.optional(v.string()),
domReviewClearedBy: v.optional(v.id("users")),
requiresReinspection: v.optional(v.boolean()),
reinspectionReason: v.optional(v.string()),
reinspectionScheduledAt: v.optional(v.string()),
reinspectionScheduledBy: v.optional(v.id("users")),
reinspectionWorkOrderId: v.optional(v.id("workOrders")),  // linked when WO opened
domMemoId: v.optional(v.id("domMemos")),
domMemoStatus: v.optional(v.union(
  v.literal("IN_PROGRESS"),
  v.literal("SUBMITTED"),
)),
```

**New `domMemos` table:**

```typescript
domMemos: defineTable({
  orgId: v.id("organizations"),
  adComplianceRecordId: v.id("adComplianceRecords"),
  adNumber: v.string(),
  status: v.union(v.literal("DRAFT"), v.literal("SUBMITTED")),
  memoContext: v.string(),          // Initial context from DOM
  memoText: v.optional(v.string()), // Full memo text (set on submission)
  memoReference: v.optional(v.string()), // DOM's reference (e.g., "DST-MEMO-001")
  createdAt: v.string(),
  createdBy: v.id("users"),
  submittedAt: v.optional(v.string()),
  submittedBy: v.optional(v.id("users")),
  updatedAt: v.string(),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"]),
```

---

### 2.4 UI Screen: Flagged Record Review (DOM Dashboard)

**Location:** DOM Dashboard → Compliance → Flagged Records

**Screen structure:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Flagged Record Review                              [DOM ACCESS ONLY] │
│                                                                      │
│ Applicability Review Required  (16 records)                         │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ AD Number  │ Subject           │ Aircraft │ Current Status      │ │
│ │ 2019-03-14 │ Lycoming IO-360…  │ All      │ NOT_APPLICABLE      │ │
│ │            │                   │          │ [Apply Basis] [↗ Memo]│ │
│ │ 2019-07-22 │ Continental IO-550…│ All     │ NOT_APPLICABLE      │ │
│ │            │                   │          │ [Apply Basis] [↗ Memo]│ │
│ │  … 14 more records …           │                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Re-Inspection Scheduled  (0 records — after Frank resolves Cat. 3)  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 2020-07-12 │ PT6A compressor…  │ All      │ ⚠ RE-INSP REQUIRED  │ │
│ │ 2021-05-28 │ Engine mount…     │ All      │ ⚠ RE-INSP REQUIRED  │ │
│ │ 2022-09-14 │ Fuel control unit…│ All      │ ⚠ RE-INSP REQUIRED  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Memo In Progress  (5 records — Category 2, before memo submission)  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 2021-14-09 │ Beechcraft prop…  │ All      │ ✏ MEMO IN PROGRESS  │ │
│ │ 2022-03-19 │ Cessna 208…      │ All      │ ✏ MEMO IN PROGRESS  │ │
│ │  … 3 more …                   │                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Apply Basis action (Category 1 workflow):**

When DOM clicks [Apply Basis]:
1. Dropdown: Select basis — NOT_APPLICABLE_BY_MODEL / NOT_APPLICABLE_BY_SERIAL_NUMBER / NOT_APPLICABLE_DOM_DETERMINATION / NOT_APPLICABLE_SUPERSEDED
2. Text field: Notes (min 10 characters, required)
3. [Save] → calls `resolveAdComplianceFlag` with `resolution: "APPLY_BASIS"`
4. On success: record disappears from "Applicability Review Required" panel. Flag cleared.

**Mark for Re-Inspection action (Category 3 workflow):**

When DOM clicks [Mark for Re-Inspection] (three-dot menu or inline button):
1. Text field: Reason for re-inspection (required)
2. [Confirm] → calls `resolveAdComplianceFlag` with `resolution: "MARK_FOR_REINSPECTION"`
3. On success: record moves to "Re-Inspection Scheduled" panel with ⚠ indicator. `domReviewFlag` remains true.
4. DOM must link a resolution work order to clear this state (future UI).

**Escalate to DOM Memo action (Category 2 workflow):**

When DOM clicks [↗ Memo]:
1. Text area: Memo context — describe why this AD does not apply (pre-populated with migration note if available)
2. [Create Memo] → calls `resolveAdComplianceFlag` with `resolution: "ESCALATE_TO_MEMO"`
3. On success: record moves to "Memo In Progress" panel. Opens memo drafting view.
4. Memo drafting view: full memo text field, reference number field, [Submit Memo] button.
5. [Submit Memo] → calls `submitDomMemo`. On success: flag cleared. Record disappears from all flagged panels.

---

## Part III — Cilla Oduya: Regression + New Test Cases

**Owner:** Cilla Oduya  
**Scope:** DST-FB-001 original test cases (regression) + TC-DST-004 through TC-DST-008 (new)

---

### DST-FB-001 Regression: Original Test Cases

| Test Case | Description | Result |
|---|---|---|
| TC-DST-001 | Null basis still hard-blocks save | ✅ PASS |
| TC-DST-002 | All four enum values still accepted | ✅ PASS |
| TC-DST-003 | Migration-flagged records accessible via resolution UI | ✅ PASS |

The DST-FB-001 fix is intact. No regression.

---

### TC-DST-004 — DOM Applies Basis to Flagged Record
**Status:** ✅ PASS

**Setup:** adComplianceRecord with `domReviewFlag: true`, `nonApplicabilityBasis: null`. DOM user logged in.

**Action:** Call `resolveAdComplianceFlag` with:
```typescript
{
  adComplianceRecordId: "<record-id>",
  resolution: "APPLY_BASIS",
  nonApplicabilityBasis: "NOT_APPLICABLE_BY_MODEL",
  nonApplicabilityNotes: "AD applicability: Lycoming/Continental piston engines only. Desert Sky Turbine fleet: Pratt & Whitney Canada PT6A/PT6C turbine engines.",
}
```

**Expected:**
- `nonApplicabilityBasis` = "NOT_APPLICABLE_BY_MODEL"
- `nonApplicabilityNotes` = provided string
- `domReviewFlag` = false
- `domReviewClearedAt` = ISO timestamp
- `domReviewClearedBy` = DOM user ID

**Result:** All fields updated correctly. Flag cleared. Reviewer identity logged. Record no longer appears in "Applicability Review Required" panel.

---

### TC-DST-005 — DOM Marks Record for Re-Inspection
**Status:** ✅ PASS

**Setup:** adComplianceRecord with `domReviewFlag: true`. DOM user logged in.

**Action:** Call `resolveAdComplianceFlag` with:
```typescript
{
  adComplianceRecordId: "<record-id>",
  resolution: "MARK_FOR_REINSPECTION",
  reinspectionReason: "Prior shop NOT_APPLICABLE determination has no documented basis. PT6A variant applicability must be verified against current aircraft S/N range.",
}
```

**Expected:**
- `requiresReinspection` = true
- `reinspectionReason` = provided string
- `reinspectionScheduledAt` = ISO timestamp
- `reinspectionScheduledBy` = DOM user ID
- **`domReviewFlag` = true** (flag NOT cleared — this is the critical assertion)

**Result:** `requiresReinspection` set. `domReviewFlag` remains true. Record moves to "Re-Inspection Scheduled" panel on UI. Flag is NOT cleared. ✅

---

### TC-DST-006 — A&P Mechanic (Non-DOM) Cannot Access Flagged Record Review
**Status:** ✅ PASS

**Setup:** adComplianceRecord with `domReviewFlag: true`. **Mechanic user** (role: `mechanic`, no `dom_compliance_review` permission) logged in.

**Action:** Attempt to call `resolveAdComplianceFlag`.

**Expected:** `requireDomPermission` check throws `ConvexError`. HTTP 403 equivalent. Mutation does not execute.

**Result:** ConvexError thrown: "Insufficient permissions: dom_compliance_review required." Record unchanged. Mechanic role confirmed to have zero access to the flagged record review screen at both UI (hidden) and API (rejected) levels.

---

### TC-DST-007 — Resolution via Memo Template: Basis Set to DOM_DETERMINATION, Memo Reference in Notes
**Status:** ✅ PASS

**Setup:** adComplianceRecord with `domReviewFlag: true`. DOM user logged in.

**Step 1:** Call `resolveAdComplianceFlag` with `resolution: "ESCALATE_TO_MEMO"`, `nonApplicabilityNotes: "Beechcraft King Air propeller AD; no King Air on Desert Sky Turbine certificate."`.

**Expected after Step 1:**
- `domMemoId` set to new memo record ID
- `domMemoStatus` = "IN_PROGRESS"
- `domReviewFlag` still = true
- Memo record created with `status: "DRAFT"`

**Step 2:** Call `submitDomMemo` with `memoId`, `memoText: "Desert Sky Turbine operates exclusively PT6A-powered turboprop and turboshaft aircraft. The Beechcraft King Air propeller airworthiness directive (AD 2021-14-09) is not applicable to any aircraft on our certificate. This determination is made by Frank Nguyen, DOM, effective 2026-02-15."`, `memoReference: "DST-MEMO-001"`.

**Expected after Step 2:**
- Memo `status` = "SUBMITTED"
- `nonApplicabilityBasis` = "NOT_APPLICABLE_DOM_DETERMINATION"
- `nonApplicabilityNotes` contains "DST-MEMO-001"
- `domReviewFlag` = false
- `domReviewClearedAt` = timestamp
- `domReviewClearedBy` = DOM user ID

**Result:** Both steps pass. Two-step memo flow confirmed. Flag cleared only after memo submission, not at escalation time.

---

### TC-DST-008 — After All 24 DST Records Resolved: Panel Shows Zero
**Status:** ✅ PASS

**Setup:** All 24 Desert Sky Turbine flagged records resolved: 16 via APPLY_BASIS, 5 via ESCALATE_TO_MEMO → SUBMIT, 3 via MARK_FOR_REINSPECTION.

**Query:** `getFlaggedRecordsForReview(orgId: "dst-org")` — returns records where `domReviewFlag: true` AND `requiresReinspection: false` (i.e., the "Applicability Review Required" panel).

**Expected:** Zero records in "Applicability Review Required" panel for DST org.  
**Expected:** Three records in "Re-Inspection Scheduled" panel (Category 3 records).

**Result:**
- "Applicability Review Required" panel: 0 records ✅
- "Re-Inspection Scheduled" panel: 3 records ✅ (Category 3 — awaiting Frank's 30-day follow-up)
- Cross-org check: other orgs' flagged records unaffected ✅

---

### Cilla Sign-Off

Regression: DST-FB-001 original test cases TC-DST-001, TC-DST-002, TC-DST-003: all PASS. Fix intact.  
New test cases TC-DST-004 through TC-DST-008: all PASS.

The critical behavior I want to call out: TC-DST-005 (Mark for Re-Inspection) correctly leaves `domReviewFlag: true`. This is the design intent — records without a defensible basis are not silently deleted or cleared. They remain visible. They move to a different visual panel. They require a resolution work order to close. That's the correct compliance posture. Marcus reviewed this and agrees.

**TC-DST-001 through TC-DST-008: ALL PASS.**

*— Cilla Oduya, QA Lead*

---

## Part IV — Marcus Webb: Compliance Review of Resolution Protocol

**Review scope:** The DOM-facing resolution protocol for DST-FB-001 flagged records.

**Key compliance questions Marcus reviewed:**

**1. Are records without a defensible basis being silently deleted?**  
No. Category 3 records (3 of 24) are not cleared. They are moved to the "Re-Inspection Scheduled" panel with `requiresReinspection: true` and a documented reason. The `domReviewFlag` remains true. These records are more visible after Category 3 resolution, not less. They require an explicit resolution work order to clear. This is correct.

**2. Is the DOM identity recorded at every flag clearance?**  
Yes. `domReviewClearedBy` (user ID) and `domReviewClearedAt` (timestamp) are set on every APPLY_BASIS and ESCALATE_TO_MEMO→SUBMIT clearance. This is an audit trail entry. It is not optional and cannot be bypassed.

**3. Is the two-step memo process correct for Category 2 records?**  
Yes. The memo must be submitted (Step 2) before the flag clears. A DOM cannot create a memo skeleton and immediately clear the flag — the memo text and reference must be complete. The `submitDomMemo` mutation enforces this. DST-MEMO-001 through DST-MEMO-005 are filed in Desert Sky Turbine's records.

**4. Record 22 (2020-07-12, PT6A compressor inspection): special note.**  
This is a Pratt & Whitney Canada PT6A-series AD. Desert Sky Turbine operates PT6A engines. This is the most significant of the three Category 3 records. Frank has committed to resolving it within 30 days. Until resolved, the record remains in "Re-Inspection Scheduled" status. Marcus is monitoring this specifically. If the AD is found to be applicable and Desert Sky is not compliant, this becomes an immediate compliance hold on affected aircraft. Frank understands this.

**Marcus's compliance verdict on the resolution protocol:** ✅ PASS. The three-action resolution model (APPLY_BASIS / MARK_FOR_REINSPECTION / ESCALATE_TO_MEMO) correctly handles all three categories of flagged records without creating silent compliance gaps.

*— Marcus Webb, Compliance Architect*

---

## WS26-C Success Criteria — Verification

| Criterion | Status |
|---|---|
| Frank's review complete: 24 records categorized | ✅ Category 1: 16, Category 2: 5, Category 3: 3 |
| Admin resolution UI shipped | ✅ DOM dashboard, Compliance → Flagged Records |
| `resolveAdComplianceFlag` mutation implemented | ✅ |
| `submitDomMemo` mutation implemented | ✅ |
| Cilla regression: DST-FB-001 test cases PASS | ✅ TC-DST-001 through TC-DST-003 PASS |
| Cilla new test cases TC-DST-004 through TC-DST-008 PASS | ✅ All PASS |
| Marcus compliance review of resolution protocol: PASS | ✅ |
| Records without defensible basis NOT silently deleted | ✅ Category 3 → Re-Inspection panel |
| DOM identity recorded at every clearance | ✅ domReviewClearedBy and timestamp |

---

## Open Items Forwarded (30-day follow-up)

| Item | Owner | Target |
|---|---|---|
| Record 22 (PT6A compressor AD) — applicability determination | Frank Nguyen | 30 days from Phase 26 ship |
| Record 23 (engine mount fatigue) — aircraft-type verification | Frank Nguyen | 30 days from Phase 26 ship |
| Record 24 (PT6A fuel control unit, variant verification) | Frank Nguyen | 30 days from Phase 26 ship |
| Link resolution work orders to Category 3 records when complete | Frank Nguyen + Devraj | When WOs created |
| Phase 27 gate: Desert Sky Turbine FSDO audit readiness | Marcus Webb | Phase 27 scope |

---

*WS26-C filed. Phase 26 WS26-C ✅ DONE.*
