# WS28-B — v1.3 Sprint 2: S-76C Part 29 ALS Tracking UI (F-1.3-B) + FSDO Audit Export (F-1.3-D)
**Phase:** 28
**Status:** ✅ COMPLETE — PASS
**Sprint Dates:** 2026-03-16 to 2026-03-29
**Filed:** 2026-03-29

**Owners:**
- Chloe Park — Frontend (S-76C ALS board extensions, FSDO export UI trigger)
- Finn Calloway — Frontend (Part 29 UI components, CMR section)
- Devraj Anand — Engineering (FSDO audit export backend, Part 29 extension fields)
- Jonas Harker — Infrastructure (background export job queue)
- Cilla Oduya — QA (TC-1.3-B + TC-1.3-D execution)
- Marcus Webb — Compliance (FSDO export template review)

**Backend prerequisite:** WS27-B `alsItems` Part 29 extension fields (`certificationBase`, `dualAuthorityEngine`, `dualAuthorityIcaRef`, `complianceCategory`) — all COMPLETE.

---

## Table of Contents

1. [Sprint 2 Scope](#1-sprint-2-scope)
2. [F-1.3-B — S-76C Part 29 ALS Tracking UI](#2-f-13b-s-76c-part-29-als-tracking-ui)
3. [F-1.3-D — FSDO Audit Export](#3-f-13d-fsdo-audit-export)
4. [React Components + Convex Pseudocode](#4-react-components--convex-pseudocode)
5. [Cilla Oduya — Test Execution](#5-cilla-oduya-test-execution)
6. [Marcus Webb — Compliance Review](#6-marcus-webb-compliance-review)
7. [Sprint 2 Sign-Off](#7-sprint-2-sign-off)

---

## 1. Sprint 2 Scope

Sprint 2 extends the ALS UI patterns from Sprint 1 to the Sikorsky S-76C (Part 29) and ships the FSDO audit export. F-1.3-B builds on F-1.3-A's component architecture; most of the board structure is shared. The Part 29 delta is focused: badge, CMR grouping, dual-authority engine display. F-1.3-D is the engineering-heavy piece of the sprint.

**Sprint 2 tasks completed:**

| Task | Owner | Days | Status |
|---|---|---|---|
| Part 29 badge on ALS board items | Chloe + Finn | 1 | ✅ DONE |
| CMR section grouping in ALS board | Chloe + Finn | 2 | ✅ DONE |
| Dual-authority engine inline note display | Chloe | 1 | ✅ DONE |
| Sikorsky mandatory SB board extension | Devraj | 1 | ✅ DONE |
| N76LS compliance surface activation flag | Devraj | 0.5 | ✅ DONE |
| FSDO audit export — compliance audit PDF template | Devraj | 4 | ✅ DONE |
| FSDO export — scope options (single/org/date range) | Devraj | 2 | ✅ DONE |
| FSDO export — background job queue (Jonas) | Jonas | 1 | ✅ DONE |
| FSDO export — UI trigger on aircraft detail + org settings | Chloe | 1 | ✅ DONE |
| Marcus compliance review: FSDO template | Marcus | 2 | ✅ DONE |
| TC-1.3-B + TC-1.3-D test execution | Cilla | 2 | ✅ DONE — 12/12 PASS |

---

## 2. F-1.3-B — S-76C Part 29 ALS Tracking UI

### 2.1 Part 29 Badge

Every ALS item for a Part 29 aircraft (N76LS) displays a "Part 29" badge in the component name line. This is a non-intrusive visual indicator — it does not change the item's urgency or state, but ensures that anyone reviewing the ALS board understands they are working with a transport category helicopter and its higher-stringency compliance baseline.

```
┌─────────────────────────────────────────────────────────────┐
│ Main Rotor Hub Assembly            [Part 29] [WITHIN_LIMIT]  │
│ S76-ALS-04.2.1 | P/N 76400-20500-105 | 5,000 hr RETIRE       │
│ Current: 3,847 hr | Remaining: 1,153 hr                      │
└─────────────────────────────────────────────────────────────┘
```

The Part 29 badge is a small blue pill label ("Part 29") rendered next to the component name. It appears on all ALS items for N76LS regardless of category.

### 2.2 CMR Section — Certification Maintenance Requirements

CMR items (where `complianceCategory === "CMR"`) are grouped into a distinct "Certification Maintenance Requirements" section within the ALS board. This section appears below the standard ALS items list.

```
─────────────────────────────────────────────────────────────
ALS Items (29 items)
─────────────────────────────────────────────────────────────
[standard ALS items sorted by urgency]

─────────────────────────────────────────────────────────────
Certification Maintenance Requirements (CMRs) — 4 items
Part 29 — FAA-approved scheduled maintenance tasks required
for continued certification credit.
─────────────────────────────────────────────────────────────
CMR-04-70-001 | Engine fire detection loop continuity test
  600-hr interval | Last performed: 2025-11-20 (3,247 hr)
  Next due: 3,847 hr | WITHIN_LIMIT ✅

CMR-04-70-003 | Fuel boost pump — primary circuit check
  300-hr interval | Last performed: 2025-11-20 (3,247 hr)
  Next due: 3,547 hr | DUE SOON ⚠️ [97 hr remaining]
─────────────────────────────────────────────────────────────
```

CMR items are rendered with the same urgency state color coding as standard ALS items (OVERDUE = red, DUE_SOON = amber, WITHIN_LIMIT = green). The section header includes a brief regulatory explanatory note: "FAA-approved scheduled maintenance tasks required for continued certification credit." This note helps DOMs and mechanics understand why CMRs appear in the ALS compliance board.

### 2.3 Dual-Authority Engine Items

Engine ALS items with `dualAuthorityEngine: true` display an inline authority note below the component name:

```
┌─────────────────────────────────────────────────────────────┐
│ Turbomeca Arriel 2S1 Engine — Gas Producer Module  [Part 29] │
│ S76-ALS-04.5.1                                               │
│ Engine Authority: Turbomeca Arriel 2S1 ICA                   │
│ Interval: Per Turbomeca ICA (3,500 hr component life)        │
│ WITHIN_LIMIT ✅                                              │
└─────────────────────────────────────────────────────────────┘
```

The "Engine Authority" inline note pulls from `dualAuthorityIcaRef` (e.g., "Turbomeca Arriel 2S1 ICA"). This note is displayed in a small, secondary text style — visible but not dominant. It ensures Sandra or Tobias reviewing N76LS engine components always knows which authority governs that item without having to know to look at the backend data field.

### 2.4 Sikorsky Mandatory SB Board

`siItems` with `siCategory: "MFR_SB"` or a new `siCategory: "SIKORSKY_SB"` (added in this sprint) appear on the Mandatory SIs tab for N76LS. The Sikorsky SB board renders identically to the Bell SI board (Sprint 1) with one visual difference: a "Sikorsky SB" badge replaces the Bell SI identifier.

The `siCategory` enum in `siItems` is extended with `"SIKORSKY_SB"` in this sprint. The existing schema allows the addition without migration since it's a union extension with no existing data.

### 2.5 N76LS Compliance Surface Activation

N76LS was previously in a disabled compliance state. With F-1.3-B complete:

- `aircraft.complianceSurfaceEnabled = true` flag set for N76LS.
- The ALS board, SI board, and FSDO export are now accessible for N76LS.
- Initial ALS data is NOT pre-loaded. The data entry session (WS28-F) will populate the board. Until then, N76LS shows the empty state: "No ALS items recorded — start data entry or use the S-76C template library."

The S-76C template library contains the 33 ALS/CMR items from WS27-B §4, pre-configured as templates. Sandra's data entry session (WS28-F) will use these templates to enter baseline hours and cycles for each item.

---

## 3. F-1.3-D — FSDO Audit Export

### 3.1 Feature Overview

The FSDO Audit Export allows a DOM to generate a complete, print-formatted compliance PDF for any aircraft in seconds. The export is designed around the Phase 27 WS27-C finding: Frank Nguyen spent several days manually assembling the Category 3 documentation package. F-1.3-D makes that assembly instantaneous.

### 3.2 Export Contents — Per Aircraft

The compliance audit PDF contains the following sections, in order:

**Section 1 — Aircraft Identification Summary**
- Registration, make/model, S/N, engine model(s), certification basis (Part 27 or Part 29)
- Organization name, DOM name, DOM certificate number
- Export date, system name ("Athelon"), data-as-of statement: "This export reflects system records as of [timestamp]. Records reflect data entered by authorized organization personnel."

**Section 2 — ALS Compliance Board**
- All ALS items for the aircraft
- Columns: ALS Reference, Component, Life Limit, Current Hours, Hours Remaining, Last Compliance Date, Last Compliance WO, Status
- Open items (OVERDUE, DUE_SOON) highlighted in summary table at top of section
- CMR items grouped separately (Part 29 aircraft)

**Section 3 — Mandatory Service Instruction Board**
- All siItems for the aircraft (OPEN and NONCOMPLIANT)
- Columns: SI Number, Title, Compliance Window, Due Date/Hours, Status
- NONCOMPLIANT items shown in a highlighted summary at top of section

**Section 4 — AD Compliance Summary**
- All adComplianceRecords for the aircraft
- Columns: AD Number, Title, Compliance Basis, Status, Effective Date, Notes
- Flagged/re-inspection records highlighted with full flag notes

**Section 5 — Open Items Summary**
- Consolidated list of ALL overdue/noncompliant/due-soon items across ALS, SI, and AD categories
- If none: "No open compliance items as of export date."
- **TC-1.3-D-01 requirement:** This section must include ALL open items. No omissions. Cilla verifies this with a deliberately placed NONCOMPLIANT item.

**Section 6 — Signed Work Order Index**
- All work orders with RTS signatures for the audit period (or all-time if no date range)
- Columns: WO Number, Date, Description, IA/DOM Signatories, RTS Date
- Digital signature chain: each WO entry includes the signing user's certificate number and certificate type

**PDF Footer (every page):**
- Export date and time (UTC)
- "Athelon v1.3 — Compliance records as of [timestamp]"
- Page X of Y
- Organization name and aircraft tail number

### 3.3 Export Scope Options

Three scope modes, selectable in the export trigger UI:

| Scope | Description |
|---|---|
| Single Aircraft | Export compliance package for one aircraft (default when triggered from aircraft detail page) |
| All Aircraft — Org | Export compliance packages for all aircraft in the org; one combined PDF |
| Date Range | Filter work order index and compliance events to a specified start/end date range |

### 3.4 Export Trigger UI

**On aircraft detail page:**
The "Export FSDO Package" button (added in Sprint 1 as a placeholder, now functional) opens a modal:

```
Export FSDO Compliance Package — N411LS

Scope:
 ● This aircraft only (N411LS)
 ○ All aircraft in organization
 ○ Date range:  From [ ] To [ ]

Format: PDF (default)

[ Cancel ]  [ Generate Export → ]
```

On "Generate Export →": a background job is queued (Jonas's export queue). The user sees:

```
⏳ Preparing N411LS compliance export...
You'll receive a notification when your export is ready.
```

When the background job completes (typically 5–30 seconds for a single aircraft), a notification appears in the DOM's notification panel with a "Download Export" link. The export link is valid for 24 hours.

**On org settings page:** "Export compliance package for all aircraft" triggers an org-wide export via the same background queue.

### 3.5 Marcus Webb — FSDO Export Template Review Notes

Marcus reviewed the draft PDF template in Sprint 2. His requirements (from WS27-D §5 Marcus sign-off) were:

1. **PDF header must include export date, system name, and data-as-of statement.** ✅ Implemented in Section 1.
2. **The export must include ALL open/noncompliant items without omission.** ✅ Section 5 is the consolidated open items summary. TC-1.3-D-01 verifies this.
3. **AD compliance section must include flagged items with full flag notes.** ✅ Flagged records display the original flag notes (from WS26-C DST resolution work).
4. **Digital signature chain must be present for work order index.** ✅ Section 6 includes IA certificate number and type for each signed WO.

Marcus's additional requirement confirmed in Sprint 2 template review:

> "The open items summary in Section 5 is the most important section for an FSDO auditor. When the FAA shows up, they want to know: is there anything wrong with this aircraft right now? Section 5 answers that question directly. No auditor should have to read through all 150 lines of the ALS table to find out if anything is OVERDUE. The summary makes compliance status immediately legible."

---

## 4. React Components + Convex Pseudocode

### 4.1 Part 29 ALS Board Extensions

```tsx
// components/compliance/ALSComplianceBoardPart29.tsx
// Extends ALSComplianceBoard from Sprint 1 for Part 29 aircraft
// Author: Chloe Park + Finn Calloway

// The Part 29 board uses the same ALSComplianceBoard component but with two extensions:
// 1. CMR items are separated into a distinct section
// 2. dualAuthorityEngine items display the engine authority inline note

import { ALSComplianceBoard } from "./ALSComplianceBoard";

export function ALSComplianceBoardS76C({
  aircraftId,
  tailNumber,
}: {
  aircraftId: Id<"aircraft">;
  tailNumber: string;
}) {
  const alsData = useQuery(api.alsItems.getAlsComplianceDashboard, { aircraftId });

  if (!alsData) return <LoadingSpinner />;

  const standardItems = alsData.items.filter(
    (item) => item.complianceCategory !== "CMR"
  );
  const cmrItems = alsData.items.filter(
    (item) => item.complianceCategory === "CMR"
  );

  return (
    <div className="als-board-part29">
      {/* Standard ALS Items */}
      <ALSBoardSection
        title="ALS Items"
        items={standardItems}
        aircraftId={aircraftId}
        tailNumber={tailNumber}
        isCmr={false}
      />

      {/* CMR Section */}
      {cmrItems.length > 0 && (
        <CMRSection items={cmrItems} aircraftId={aircraftId} />
      )}
    </div>
  );
}

function CMRSection({
  items,
  aircraftId,
}: {
  items: AlsItemWithDerived[];
  aircraftId: Id<"aircraft">;
}) {
  return (
    <div className="cmr-section">
      <div className="cmr-section-header">
        <h3>Certification Maintenance Requirements (CMRs)</h3>
        <p className="cmr-section-note">
          Part 29 — FAA-approved scheduled maintenance tasks required for
          continued certification credit. See Sikorsky S-76C ICA §04-70-00.
        </p>
      </div>
      <div className="cmr-items-list">
        {items.map((item) => (
          <ALSItemCard key={item._id} item={item} showCmrBadge />
        ))}
      </div>
    </div>
  );
}

// DualAuthorityEngineNote — inline authority display for engine items
export function DualAuthorityEngineNote({
  dualAuthorityIcaRef,
}: {
  dualAuthorityIcaRef: string;
}) {
  return (
    <div className="dual-authority-note">
      <span className="dual-authority-label">Engine Authority:</span>
      <span className="dual-authority-ref">{dualAuthorityIcaRef}</span>
    </div>
  );
}
```

---

### 4.2 FSDO Audit Export — Convex Action

```typescript
// convex/fsdo_export.ts
// Phase 28, WS28-B Sprint 2
// Author: Devraj Anand + Jonas Harker
// Reviewed: Marcus Webb

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getOrgId, assertPermission } from "./authHelpers";
import { ConvexError } from "convex/values";

// ── Trigger: generateFsdoExport ─────────────────────────────────────────────
// DOM calls this from the UI. It enqueues a background job and returns a job ID.
// The UI polls (or listens via real-time subscription) for job completion.

export const generateFsdoExport = action({
  args: {
    scope: v.union(
      v.literal("SINGLE_AIRCRAFT"),
      v.literal("ALL_ORG_AIRCRAFT"),
      v.literal("DATE_RANGE"),
    ),
    aircraftId: v.optional(v.id("aircraft")),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance");

    // Validate scope args
    if (args.scope === "SINGLE_AIRCRAFT" && !args.aircraftId) {
      throw new ConvexError("AIRCRAFT_ID_REQUIRED for SINGLE_AIRCRAFT scope");
    }
    if (
      args.scope === "DATE_RANGE" &&
      (!args.dateRangeStart || !args.dateRangeEnd)
    ) {
      throw new ConvexError("DATE_RANGE_START and DATE_RANGE_END required for DATE_RANGE scope");
    }

    // Create a background export job record
    const jobId = await ctx.runMutation(internal.export_jobs.createExportJob, {
      orgId,
      scope: args.scope,
      aircraftId: args.aircraftId,
      dateRangeStart: args.dateRangeStart,
      dateRangeEnd: args.dateRangeEnd,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
    });

    // Schedule background job execution
    await ctx.scheduler.runAfter(0, internal.fsdo_export.executeExportJob, {
      jobId,
    });

    return { jobId, status: "QUEUED" };
  },
});

// ── Background: executeExportJob ────────────────────────────────────────────
// Runs server-side. Assembles all compliance data, generates PDF, uploads,
// and updates the job record with a download URL.

export const executeExportJob = internalAction({
  args: { jobId: v.id("exportJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.export_jobs.getExportJob, {
      jobId: args.jobId,
    });
    if (!job) return;

    try {
      await ctx.runMutation(internal.export_jobs.updateJobStatus, {
        jobId: args.jobId,
        status: "IN_PROGRESS",
      });

      // ── Assemble compliance data ──
      const orgId = job.orgId;

      // Get aircraft list based on scope
      let aircraftIds: string[];
      if (job.scope === "SINGLE_AIRCRAFT" && job.aircraftId) {
        aircraftIds = [job.aircraftId];
      } else {
        const allAircraft = await ctx.runQuery(
          internal.aircraft.getOrgAircraft,
          { orgId }
        );
        aircraftIds = allAircraft.map((a: { _id: string }) => a._id);
      }

      // For each aircraft: collect ALS items, SI items, AD records, signed WOs
      const exportPackages = await Promise.all(
        aircraftIds.map(async (aircraftId) => {
          const [aircraft, alsItems, siItems, adRecords, signedWorkOrders] =
            await Promise.all([
              ctx.runQuery(internal.aircraft.getAircraft, { aircraftId }),
              ctx.runQuery(internal.alsItems.getAllAlsItemsForExport, { aircraftId }),
              ctx.runQuery(internal.siItems.getAllSiItemsForExport, { aircraftId }),
              ctx.runQuery(internal.adRecords.getAllAdRecordsForExport, {
                aircraftId,
                dateRangeStart: job.dateRangeStart,
                dateRangeEnd: job.dateRangeEnd,
              }),
              ctx.runQuery(internal.workOrders.getSignedWorkOrdersForExport, {
                aircraftId,
                dateRangeStart: job.dateRangeStart,
                dateRangeEnd: job.dateRangeEnd,
              }),
            ]);

          // Identify open items across all compliance categories
          const openItems = [
            ...alsItems
              .filter((i: { status: string }) =>
                ["OVERDUE", "DUE_SOON"].includes(i.status)
              )
              .map((i: { status: string; componentName: string; alsReference: string; hoursRemaining: number }) => ({
                category: "ALS",
                status: i.status,
                description: `${i.componentName} (${i.alsReference})`,
                urgency: i.status === "OVERDUE" ? "HIGH" : "MEDIUM",
                detail: `${Math.abs(i.hoursRemaining)} hr ${i.status === "OVERDUE" ? "OVERDUE" : "remaining"}`,
              })),
            ...siItems
              .filter((i: { status: string }) => i.status === "NONCOMPLIANT")
              .map((i: { siNumber: string; siTitle: string }) => ({
                category: "SI",
                status: "NONCOMPLIANT",
                description: `${i.siNumber} — ${i.siTitle}`,
                urgency: "HIGH",
                detail: "Compliance window expired",
              })),
            ...adRecords
              .filter((i: { status: string }) => ["NONCOMPLIANT", "MARK_FOR_REINSPECTION"].includes(i.status))
              .map((i: { adNumber: string; title: string; status: string }) => ({
                category: "AD",
                status: i.status,
                description: `AD ${i.adNumber} — ${i.title}`,
                urgency: "HIGH",
                detail: `Status: ${i.status}`,
              })),
          ];

          return {
            aircraft,
            alsItems,
            siItems,
            adRecords,
            signedWorkOrders,
            openItems,
          };
        })
      );

      // ── Generate PDF ──
      // Uses Phase 16 PDF infrastructure (WS16-C) with new compliance audit template
      const pdfBuffer = await generateComplianceAuditPDF({
        orgId,
        exportPackages,
        exportTimestamp: new Date().toISOString(),
        scope: job.scope,
        dateRangeStart: job.dateRangeStart,
        dateRangeEnd: job.dateRangeEnd,
      });

      // ── Upload PDF to Convex file storage ──
      const storageId = await ctx.storage.store(
        new Blob([pdfBuffer], { type: "application/pdf" })
      );
      const downloadUrl = await ctx.storage.getUrl(storageId);

      // ── Update job as COMPLETE ──
      await ctx.runMutation(internal.export_jobs.updateJobStatus, {
        jobId: args.jobId,
        status: "COMPLETE",
        downloadUrl,
        storageId,
        completedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      // ── Notify DOM user ──
      await ctx.scheduler.runAfter(0, internal.notifications.notifyDomExportReady, {
        jobId: args.jobId,
        orgId,
        downloadUrl,
      });
    } catch (error) {
      await ctx.runMutation(internal.export_jobs.updateJobStatus, {
        jobId: args.jobId,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
```

---

## 5. Cilla Oduya — Test Execution

### 5.1 Test Cases — TC-1.3-B (S-76C Part 29 ALS Tracking UI)

| ID | Description | Result |
|---|---|---|
| TC-1.3-B-01 | N76LS ALS board renders after data entry; all Part 29 items show "Part 29" badge | ✅ PASS |
| TC-1.3-B-02 | CMR items appear in "Certification Maintenance Requirements" section; standard ALS items in main section | ✅ PASS |
| TC-1.3-B-03 | Dual-authority engine item displays "Engine Authority: Turbomeca Arriel 2S1 ICA" note inline | ✅ PASS |
| TC-1.3-B-04 | Sikorsky SB item with siCategory "SIKORSKY_SB" appears on N76LS Mandatory SIs tab with "Sikorsky SB" badge | ✅ PASS |
| TC-1.3-B-05 | N76LS compliance surface activated; empty state before data entry shows S-76C template library prompt | ✅ PASS |
| TC-1.3-B-06 | N76LS does not appear on Bell 206B-III template list; aircraft type correctly gates template options | ✅ PASS |

**TC-1.3-B: 6/6 PASS**

---

### 5.2 Test Cases — TC-1.3-D (FSDO Audit Export)

| ID | Description | Result |
|---|---|---|
| **TC-1.3-D-01** | **FSDO export includes ALL open items: test aircraft has a NONCOMPLIANT siItem intentionally placed. Export Section 5 (Open Items Summary) includes it.** | **✅ PASS** |
| TC-1.3-D-02 | Export Section 1 includes export date, system name ("Athelon"), and data-as-of statement | ✅ PASS |
| TC-1.3-D-03 | Export Section 6 work order index includes IA certificate number and type for each signed WO | ✅ PASS |
| TC-1.3-D-04 | Single-aircraft scope export generates PDF with only that aircraft's data | ✅ PASS |
| TC-1.3-D-05 | All-org scope export generates PDF with all aircraft in org (N411LS, N412LS, N413LS, N76LS) | ✅ PASS |
| TC-1.3-D-06 | Export generation uses background job; UI shows "Preparing export..." state; download notification fires on completion | ✅ PASS |

**TC-1.3-D-01 — Detail:**

*Test setup:* Added a test `siItem` for N411LS with `status: "NONCOMPLIANT"`, `siTitle: "TEST-NONCOMPLIANT-ITEM"`, `siNumber: "TEST-99"`. The item was set in a non-prominent position in the SI list — it would not appear on the first page of the per-aircraft SI board without scrolling.

*Test action:* Generated FSDO export for N411LS (single aircraft scope).

*Test verification:* Opened PDF. Section 5 ("Open Items Summary") on page 3 of 6. Checked for "TEST-99 — TEST-NONCOMPLIANT-ITEM". Present ✅. Item includes status (NONCOMPLIANT), category (SI), and detail ("Compliance window expired") ✅.

*Cleanup:* Test siItem removed post-test.

**TC-1.3-D: 6/6 PASS**

---

### 5.3 Test Summary

| Suite | Cases | PASS | FAIL |
|---|---|---|---|
| TC-1.3-B (S-76C Part 29 ALS Tracking UI) | 6 | 6 | 0 |
| TC-1.3-D (FSDO Audit Export) | 6 | 6 | 0 |
| **Total** | **12** | **12** | **0** |

**Zero failures. TC-1.3-D-01 (FSDO export open items completeness) confirmed PASS.**

**Cilla Oduya QA Sign-Off: ✅ PASS — Sprint 2 complete. TC-1.3-D-01 was the most important compliance verification in the sprint. The export does not filter out bad news — that's what makes it FSDO-ready.**

---

## 6. Marcus Webb — Compliance Review

I reviewed the FSDO audit export PDF template in Sprint 2. My review notes:

**What the export does correctly:**

1. Section 5 (Open Items Summary) consolidates all OVERDUE/NONCOMPLIANT/DUE_SOON findings from all three compliance categories (ALS, SI, AD). An FSDO auditor can turn to that section and immediately see the complete compliance picture. This is the right design.

2. Section 6 (Signed Work Order Index) includes the digital signature chain — IA certificate number and type for every signed work order. This is the record-keeping requirement that Part 29 operators face under FSDO inspections.

3. Section 1 data-as-of statement is legally appropriate: it notes that records reflect data entered by authorized personnel. This protects the operator if someone asks why the export doesn't match a physical logbook (it shouldn't — it reflects what's in the system, and any discrepancy is an audit finding in its own right).

**One concern addressed during review:**

*Marcus:* The flagged AD records (from WS26-C DST resolution work) must appear in the AD section with their flag notes — including records that were resolved and marked NOT_APPLICABLE. I want an auditor to be able to see that a record was flagged, reviewed, and disposed of, not that it simply doesn't exist.

*Devraj:* Confirmed. The AD compliance section includes all records regardless of status, with status and notes columns. Records with RESOLVED_NOT_APPLICABLE status display the resolution notes. Records with MARK_FOR_REINSPECTION status display the reinspection note and the date the flag was raised.

**Marcus compliance review conclusion:**

The FSDO audit export template meets the compliance requirements I set out in WS27-D and in my Sprint 2 review. The export delivers on the core promise: DOM assembles the FSDO package in seconds, not days. This is a real improvement in operator compliance posture.

**Marcus Webb Sprint 2 Compliance Review: ✅ APPROVED**
*2026-03-28*

---

## 7. Sprint 2 Sign-Off

**Chloe Park:** Part 29 extensions are clean. The CMR section and dual-authority note are exactly the kind of contextual display that makes the compliance surface legible for operators who don't know what a CMR is. The export UI — background job + notification — is a better UX than a synchronous download that times out on large orgs. ✅ SIGNED — 2026-03-29

**Finn Calloway:** Part 29 badge and CMR section layout are solid on both desktop and iPad. The SIKORSKY_SB category extension was a 30-minute schema change — nothing broke. ✅ SIGNED — 2026-03-29

**Devraj Anand:** FSDO export is the heaviest engineering piece in v1.3. Four days for the PDF template was accurate. The background job queue pattern (same as maintenance record PDF) works cleanly. Open items assembly logic was the trickiest part — making sure all three compliance categories feed into Section 5 correctly. TC-1.3-D-01 validates that it's right. ✅ SIGNED — 2026-03-29

**Jonas Harker:** Background export queue is in production-equivalent staging. Single-aircraft exports complete in 4–12 seconds. Org-wide export (4 aircraft) takes 18–35 seconds. Both are within the acceptable range for a background job with notification. ✅ SIGNED — 2026-03-29

**Cilla Oduya:** 12/12 PASS. TC-1.3-D-01 is the one I was most focused on. Clean result. ✅ SIGNED — 2026-03-29

---

**Sprint 2 Status: ✅ COMPLETE — PASS**

*F-1.3-B (S-76C Part 29 ALS Tracking UI): COMPLETE*
*F-1.3-D (FSDO Audit Export): COMPLETE*
*TC-1.3-B: 6/6 PASS*
*TC-1.3-D: 6/6 PASS*
*Marcus compliance review: ✅ APPROVED*

*Sprint 3 begins: 2026-03-30*
