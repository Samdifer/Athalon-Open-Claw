# WS28-C — v1.3 Sprint 3: Repairman Cert Warning (F-1.3-E) + Integration + UAT + Release
**Phase:** 28
**Status:** ✅ COMPLETE — PASS
**Sprint Dates:** 2026-03-30 to 2026-04-06
**Release Date:** 2026-04-07
**Filed:** 2026-04-07

**Owners:**
- Devraj Anand — Engineering (F-1.3-E trigger + DOM review logging, integration support)
- Chloe Park — Frontend (F-1.3-E modal + persistent banner)
- Cilla Oduya — QA (TC-1.3-E + full integration test suite)
- Marcus Webb — Compliance (final sign-off: F-1.3-A through F-1.3-E)
- Jonas Harker — Infrastructure (release deployment)
- Nadia Solis — Product/CS (UAT coordination, release notes)
- Sandra Okafor — UAT participant (Bell ALS UI + SI dashboard)
- Frank Nguyen — UAT participant (FSDO audit export)
- Priya Sharma — UAT participant (general compliance surface)

**Closes:** OPEN-2C-01 (Repairman Certificate Employer-Transition Warning)

---

## Table of Contents

1. [Sprint 3 Scope](#1-sprint-3-scope)
2. [F-1.3-E — Repairman Certificate Employer-Transition Warning](#2-f-13e-repairman-certificate-employer-transition-warning)
3. [Integration Testing — Full v1.3 Feature Set](#3-integration-testing)
4. [UAT — Customer Representatives](#4-uat-customer-representatives)
5. [v1.3 Release Checklist + Release Notes](#5-v13-release-checklist--release-notes)
6. [Marcus Webb — Final Compliance Sign-Off](#6-marcus-webb-final-compliance-sign-off)
7. [Sprint 3 + Release Sign-Off](#7-sprint-3--release-sign-off)

---

## 1. Sprint 3 Scope

Sprint 3 is one week. It ships F-1.3-E (Repairman certificate warning), runs integration testing across all five features, completes UAT with three customer representatives, and deploys v1.3 to production.

**Sprint 3 tasks completed:**

| Task | Owner | Days | Status |
|---|---|---|---|
| F-1.3-E: Repairman cert employer-transition trigger | Devraj | 1 | ✅ DONE |
| F-1.3-E: Warning modal + persistent banner UI | Chloe | 1 | ✅ DONE |
| F-1.3-E: DOM "Mark as Reviewed" logging | Devraj | 0.5 | ✅ DONE |
| TC-1.3-E test cases | Cilla | 1 | ✅ DONE — 4/4 PASS |
| Integration testing: full v1.3 (F-1.3-A through F-1.3-E) | Cilla | 3 | ✅ DONE — 22/22 PASS |
| Marcus compliance final sign-off: all five features | Marcus | 2 | ✅ DONE — APPROVED |
| UAT: Sandra Okafor (Bell ALS UI + SI dashboard) | Sandra + Nadia | 2 | ✅ DONE — SIGNED |
| UAT: Frank Nguyen (FSDO export) | Frank + Nadia | 1 | ✅ DONE — SIGNED |
| UAT: Priya Sharma (compliance surface general) | Priya + Nadia | 1 | ✅ DONE — SIGNED |
| Release checklist + deployment | Jonas | 2 | ✅ DONE — DEPLOYED |
| v1.3 release notes | Nadia | 1 | ✅ DONE |

---

## 2. F-1.3-E — Repairman Certificate Employer-Transition Warning

### 2.1 Background

OPEN-2C-01 was filed in Phase 21 during High Desert MRO onboarding. It has been deferred through two planning cycles. v1.3 closes it.

A Repairman Certificate (14 CFR Part 65 Subpart E, §65.101(a)(1)) is issued to a specific individual employed at a specific certificated repair station. Unlike an A&P certificate (a personal, portable license), a Repairman Certificate is valid only while the holder is employed at the issuing organization. If the holder changes employers, the certificate is not valid at the new employer. A new FAA Form 8610-2 application is required.

Athelon's qualification alerts (Phase 15, WS15-J) track certificate existence and expiry but have no mechanism to detect employer transitions. F-1.3-E adds that mechanism.

### 2.2 Warning Trigger

The warning fires in two scenarios:

**Scenario A — User offboarding:**
When an admin user removes a user from an organization (sets `user.orgMemberships[orgId].status = "INACTIVE"`), and that user holds one or more certificates with `type: "REPAIRMAN"` in their `certificates` array, the offboarding workflow displays the Repairman certificate warning before completing the offboarding.

**Scenario B — Org transfer (multi-org users):**
When a user with `certificate_type: "REPAIRMAN"` is added to a new organization where their existing Repairman Certificate was issued by a different organization, the system checks the `issuingOrganizationId` on the certificate. If it differs from the new org, the warning fires on the new org admin's confirmation screen.

### 2.3 Warning Modal — Full Text

```
⚠️ Employer Transition — Repairman Certificate Validation Required
────────────────────────────────────────────────────────────────────
[User Display Name] holds a Repairman Certificate [Certificate Number].

Under 14 CFR §65.101(a)(1), a Repairman Certificate issued for a
specific employer is valid only while the holder is employed at the
issuing organization. If this user is changing employers, their current
Repairman Certificate is not valid for work performed at the new
organization. A new Repairman Certificate application (FAA Form 8610-2)
may be required.

Action: Verify certificate validity with the new employer's DOM before
assigning maintenance work to this user.

────────────────────────────────────────────────────────────────────
[ Mark as Reviewed ]    [ Continue Without Reviewing ]
```

**"Mark as Reviewed":** Records a review event in the user's qualification record (`repairmanCertReviewLog` — array of `{ reviewedAt, reviewedBy, note }`). The modal closes. Offboarding or org transfer proceeds.

**"Continue Without Reviewing":** The modal closes and the action proceeds, but a persistent banner is added to the user's qualification record in the new org:

```
⚠️ Repairman Certificate Review Pending
Repairman Certificate [Cert#] has not been validated for this organization.
A DOM must review and confirm certificate validity before this user is
assigned maintenance work.  [Review Now →]  [Dismiss for Today]
```

The persistent banner remains visible to DOM users on the personnel detail page until a DOM clicks "Review Now →" and marks it reviewed.

### 2.4 Who Sees the Warning

- **DOM and Admin users** see the warning in full.
- **The Repairman certificate holder** does not see the warning. The system does not display regulatory-advisory content to the individual whose certificate is in question. This design is deliberate and was specified in WS27-D: the warning is for the DOM who is making the employment decision, not for the employee.

### 2.5 Implementation

```typescript
// convex/users_repairman_warning.ts
// Phase 28, WS28-C Sprint 3
// Author: Devraj Anand

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getOrgId, assertPermission } from "./authHelpers";
import { ConvexError } from "convex/values";

// ── Query: getRepairmanCertWarnings ─────────────────────────────────────────
// Returns unreviewed Repairman cert warnings for the org.
// Used by DOM dashboard to populate the persistent banner list.

export const getRepairmanCertWarnings = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance");

    const pendingWarnings = await ctx.db
      .query("repairmanCertWarnings")
      .withIndex("by_org_reviewed", (q) =>
        q.eq("orgId", orgId).eq("reviewed", false)
      )
      .collect();

    return pendingWarnings;
  },
});

// ── Mutation: markRepairmanCertReviewed ─────────────────────────────────────
// DOM calls this after reviewing the warning.

export const markRepairmanCertReviewed = mutation({
  args: {
    warningId: v.id("repairmanCertWarnings"),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "manage_personnel");

    const warning = await ctx.db.get(args.warningId);
    if (!warning) throw new ConvexError("WARNING_NOT_FOUND");
    if (warning.orgId !== orgId) throw new ConvexError("ORG_MISMATCH");

    const userId = await ctx.auth.getUserIdentity();
    const userRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), userId!.subject))
      .first();
    if (!userRecord) throw new ConvexError("USER_NOT_FOUND");

    const now = new Date().toISOString();
    await ctx.db.patch(args.warningId, {
      reviewed: true,
      reviewedAt: now,
      reviewedBy: userRecord._id,
      reviewNote: args.reviewNote,
      updatedAt: now,
    });

    // Update the user's repairmanCertReviewLog
    const user = await ctx.db.get(warning.subjectUserId);
    if (user) {
      const existingLog = (user as Record<string, unknown>).repairmanCertReviewLog as Array<unknown> ?? [];
      await ctx.db.patch(warning.subjectUserId, {
        repairmanCertReviewLog: [
          ...existingLog,
          {
            reviewedAt: now,
            reviewedBy: userRecord._id,
            reviewedByName: userRecord.displayName,
            certNumber: warning.certNumber,
            orgId,
            note: args.reviewNote,
          },
        ],
      });
    }

    return { warningId: args.warningId, reviewed: true };
  },
});

// ── Trigger: fires during user offboarding workflow ─────────────────────────
// Called by offboardUserFromOrg mutation before completing the offboarding.

export async function checkRepairmanCertOnOffboard(
  ctx: MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<{ hasRepairmanCert: boolean; certs: RepairmanCert[] }> {
  const user = await ctx.db.get(userId);
  if (!user) return { hasRepairmanCert: false, certs: [] };

  const repairmanCerts = ((user as Record<string, unknown>).certificates as Array<{ type: string; certNumber: string }> ?? []).filter(
    (cert) => cert.type === "REPAIRMAN"
  );

  if (repairmanCerts.length === 0) return { hasRepairmanCert: false, certs: [] };

  // Create warning records
  const now = new Date().toISOString();
  for (const cert of repairmanCerts) {
    await ctx.db.insert("repairmanCertWarnings", {
      orgId,
      subjectUserId: userId,
      certNumber: cert.certNumber,
      triggerType: "OFFBOARDING",
      reviewed: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { hasRepairmanCert: true, certs: repairmanCerts };
}
```

### 2.6 OPEN-2C-01 Closure Statement

**OPEN-2C-01** — Repairman Certificate employer-transition warning — is **CLOSED** by F-1.3-E.

The warning fires on user offboarding and on org transfer for any user holding a Repairman Certificate. DOM users see the full warning with regulatory citation and the action required. The certificate holder does not see the warning. DOM review is logged with timestamp and user ID. The persistent banner prevents the issue from being silently overlooked.

---

## 3. Integration Testing — Full v1.3 Feature Set

### 3.1 Integration Test Scope

Cilla ran a full integration pass across all five v1.3 features on the staging environment. The integration test covers cross-feature seams: does the FSDO export correctly include ALS items added via F-1.3-A? Does the fleet SI alert panel correctly exclude COMPLIANT items when F-1.3-C's closeSiItem mutation fires? Do the Part 29 extensions from F-1.3-B appear correctly in the FSDO export generated by F-1.3-D?

### 3.2 Integration Test Results

| ID | Scenario | Result |
|---|---|---|
| INT-01 | F-1.3-A → F-1.3-D: ALS item added for N411LS via Bell template; FSDO export for N411LS includes new item in Section 2 | ✅ PASS |
| INT-02 | F-1.3-A → F-1.3-D: ALS item marked OVERDUE; FSDO export Section 5 (Open Items) includes the overdue item | ✅ PASS |
| INT-03 | F-1.3-C → F-1.3-D: NONCOMPLIANT siItem for N411LS; FSDO export Section 3 + Section 5 include the item | ✅ PASS |
| INT-04 | F-1.3-C → F-1.3-C: closeSiItem fires for recurring SI; fleet SI alert panel updates; successor item in OPEN state visible on per-aircraft SI board | ✅ PASS |
| INT-05 | F-1.3-B → F-1.3-D: N76LS ALS item with CMR category; FSDO export renders CMR items in separate section (Section 2) for Part 29 aircraft | ✅ PASS |
| INT-06 | F-1.3-B → F-1.3-D: dual-authority engine item for N76LS; FSDO export Section 2 shows engine authority note in ALS row | ✅ PASS |
| INT-07 | F-1.3-A + F-1.3-B: fleet ALS board shows N411LS (Part 27, no badge) and N76LS (Part 29, badge) correctly differentiated | ✅ PASS |
| INT-08 | F-1.3-E: user with Repairman cert offboarded from org; warning modal fires; DOM marks reviewed; review log entry appears in user's personnel record | ✅ PASS |
| INT-09 | F-1.3-E: Repairman cert warning persistent banner: DOM user sees it; A&P user does not see it; certificate holder user does not see it | ✅ PASS |
| INT-10 | F-1.3-E → F-1.3-D: FSDO export personnel section (if applicable) does not expose Repairman warning to external view — warning is internal-only | ✅ PASS |
| INT-11 | ALS board urgency sort: cross-aircraft, cross-status items sorted correctly in fleet view | ✅ PASS |
| INT-12 | SI compliance workflow: closeSiItem on non-recurring SI; item disappears from OPEN list; work order's siItemIds array updated | ✅ PASS |
| INT-13 | FSDO export background queue: two simultaneous export requests; both complete independently; each user receives their own notification | ✅ PASS |
| INT-14 | Org isolation: N76LS ALS data not accessible to DST org users | ✅ PASS |
| INT-15 | Org isolation: Lone Star Rotorcraft FSDO export does not include DST aircraft | ✅ PASS |
| INT-16 | F-1.3-A iPad rendering: ALS board, template modal, SI board all display correctly on iPad (375px and 768px viewport) | ✅ PASS |
| INT-17 | F-1.3-C + F-1.3-A: Adding a Bell ALS item and a Bell mandatory SI in the same session; both appear on correct tabs without interference | ✅ PASS |
| INT-18 | F-1.3-D export with date range: work order index correctly filtered to date range; ALS/SI/AD sections include all items (date range does not filter compliance items, only WO index) | ✅ PASS |
| INT-19 | F-1.3-B: N76LS with no ALS data entered: empty state shown; S-76C template library prompt present; no errors | ✅ PASS |
| INT-20 | F-1.3-D: Export "All aircraft — Org" scope with N76LS having no data: N76LS section in PDF shows empty state; no error | ✅ PASS |
| INT-21 | F-1.3-A + F-1.3-C: closing an SI item via F-1.3-C compliance workflow also triggers a DOM alert dismissal if there was a SI_NONCOMPLIANT alert active | ✅ PASS |
| INT-22 | F-1.3-E: No Repairman cert warning fires for user with only A&P/IA certificates on offboarding | ✅ PASS |

**Integration Test: 22/22 PASS. Zero failures.**

**Cilla Oduya Integration Test Sign-Off: ✅ PASS — Full v1.3 integration clean. All cross-feature seams verified. No regressions found against prior feature surfaces (LLP dashboard, qualification alerts, customer portal all still pass in separate regression run).**

---

## 4. UAT — Customer Representatives

### 4.1 Sandra Okafor — UAT (Bell ALS UI + Mandatory SI Dashboard)

*Sandra Okafor, DOM — Lone Star Rotorcraft, Fort Worth TX.*
*UAT session conducted: 2026-04-02. Nadia Solis present.*

**Sandra's session:**

Sandra spent 90 minutes in the staging environment working through F-1.3-A and F-1.3-C. She brought three printed Bell SIs from her paper binder to enter as part of the session. Tobias Ferreira joined for the last 30 minutes.

**F-1.3-A — ALS Tracking UI:**

> "The template library is exactly what I needed. I didn't have to type 'Main Rotor Hub Assembly' — I just searched 'hub' and there it is, with the part number and the 5,000-hour limit already filled in. I entered four of the Bell ALS items in about 12 minutes. At that rate I can do all 23 in under an hour."

Sandra specifically tested the OVERDUE scenario by entering a fictitious ALS item with a life limit below the aircraft's current hours. The item appeared in the OVERDUE position with the red badge. She found it immediately without searching.

**F-1.3-C — Mandatory SI Dashboard:**

> "The paper binder banner — I smiled when I saw that. It's exactly the right message. I've been managing that binder for two years. The fact that you can make me smile about migrating it to software tells me you got the UX right."

Sandra tested the Mark Compliant workflow for a Bell SI. She found it intuitive. One question she raised: can she add the SI directly from the work order screen (rather than navigating to the SI board and clicking Mark Compliant)? Nadia logged this as a UX enhancement for v1.4 but noted it does not block v1.3.

**Tobias Ferreira (joined for final 30 minutes):**

> "The regulatory distinction is correct. The SI board is separate from the ALS items — that's what we asked for. When I see 'BHT-206B-SI-42' on the SI tab and it's red, I know exactly what to do. No interpretation required."

**Sandra Okafor UAT Sign-Off: ✅ APPROVED — F-1.3-A and F-1.3-C production-ready.**
*Sandra Okafor, DOM, Lone Star Rotorcraft — 2026-04-02*

**Tobias Ferreira observation confirmed:**
*SI/ALS regulatory distinction maintained correctly in UI.*

---

### 4.2 Frank Nguyen — UAT (FSDO Audit Export)

*Frank Nguyen, DOM — Desert Sky Turbine, Scottsdale AZ.*
*UAT session conducted: 2026-04-03. Nadia Solis present.*

**Frank's session:**

Frank tested the FSDO export for DST-N8031T (a Cessna 208B Grand Caravan in the DST fleet). He generated a single-aircraft export and reviewed the PDF end-to-end.

> "Section 5 is the section I've been waiting for. Open items, right there. When the FAA came for the Category 3 review, I spent three days assembling what this PDF would have given me in 30 seconds. The export includes the flagged record notation — it shows Record 22 as RESOLVED with my disposition notes. That's exactly what an auditor needs to see: not that the record doesn't exist, but that it was examined and resolved."

Frank tested the date range filter: he generated a 12-month export for N8031T and verified that the work order index was correctly scoped while ALS and SI compliance records remained complete (date range filters only the WO index, not compliance items — by design).

One finding: the digital signature chain in Section 6 showed the IA's Athelon display name rather than their legal name as it appears on their certificate. Frank noted that for FSDO purposes, the certificate holder's legal name should appear alongside or instead of the display name. Devraj confirmed this is a 1-line data model fix: `workOrder.iaSignedByLegalName` vs. `iaSignedByDisplayName`. Devraj applied the fix in Sprint 3 same-day. TC-1.3-D-03 was re-run and passed.

**Frank Nguyen UAT Sign-Off: ✅ APPROVED — F-1.3-D production-ready. Legal name fix applied and verified.**
*Frank Nguyen, DOM, Desert Sky Turbine — 2026-04-03*

---

### 4.3 Priya Sharma — UAT (Compliance Surface General)

*Priya Sharma, DOM — Skyline Air Charter, Dallas TX (Part 135 charter operator).*
*UAT session conducted: 2026-04-04. Nadia Solis present.*

Priya's session focused on verifying that v1.3 compliance features are correctly scoped to aircraft in her org (Robinson R44 fleet — Part 27, no Bell or S-76C aircraft) and that the new compliance surfaces are not erroneously exposed for aircraft types that haven't been configured.

**Priya's observations:**

- R44 ALS board operates correctly; no Part 29 badge, no CMR section, no "Engine Authority" note. Correct.
- Bell 206B-III template library does not appear for her R44 aircraft. Correct.
- FSDO export works for her R44 (Robinson R44 ALS items + AD records + WO index). PDF is well-formatted.
- Mandatory SI board is accessible but empty for her R44 (no siItems entered yet — R44 doesn't have Bell-style mandatory SIs, but the board is visible with an empty state and a "No mandatory SIs" note). Priya noted this is correct; she may enter a Lycoming service bulletin in the future.

> "I was worried the helicopter stuff would break my Robinson screen. It doesn't. Everything is clean. The FSDO export for my R44 is useful — I hadn't thought about it before, but getting a compliance package together in a PDF is genuinely helpful for charter operations when the FSDO asks for documentation on short notice."

**Priya Sharma UAT Sign-Off: ✅ APPROVED — v1.3 features correctly scoped to aircraft type. R44/Part 91 surfaces unaffected.**
*Priya Sharma, DOM, Skyline Air Charter — 2026-04-04*

---

## 5. v1.3 Release Checklist + Release Notes

### 5.1 Release Checklist

| Item | Owner | Status |
|---|---|---|
| F-1.3-A: Bell 206B-III ALS Tracking UI — staging PASS | Cilla | ✅ |
| F-1.3-B: S-76C Part 29 ALS Tracking UI — staging PASS | Cilla | ✅ |
| F-1.3-C: Mandatory SI Dashboard — staging PASS | Cilla | ✅ |
| F-1.3-D: FSDO Audit Export — staging PASS + Frank UAT PASS | Cilla + Frank | ✅ |
| F-1.3-E: Repairman Certificate Warning — staging PASS | Cilla | ✅ |
| Integration test: 22/22 PASS | Cilla | ✅ |
| Marcus compliance clearance: all five features | Marcus | ✅ |
| Sandra Okafor UAT sign-off | Sandra + Nadia | ✅ |
| Frank Nguyen UAT sign-off (with legal name fix) | Frank + Devraj | ✅ |
| Priya Sharma UAT participation | Priya + Nadia | ✅ |
| OPEN-2C-01 closure confirmed | Marcus | ✅ |
| Release notes drafted | Nadia | ✅ |
| Jonas release readiness PASS | Jonas | ✅ |
| Production deployment authorization | Nadia + Marcus | ✅ |

**Release checklist: ALL ITEMS COMPLETE.**

### 5.2 v1.3 Release Notes

**Athelon v1.3 — Compliance Surface Release**
*Ship date: 2026-04-07*

---

**What's in v1.3:**

**Bell 206B-III ALS Tracking (F-1.3-A)**
Lone Star Rotorcraft Bell fleet (N411LS, N412LS, N413LS) can now track all 23 Bell 206B-III Airworthiness Limitations Section items directly in Athelon. Pre-configured Bell 206B-III templates reduce manual data entry. The ALS board sorts by urgency: overdue items are immediately visible. Combined fleet compliance view shows all three aircraft at a glance.

**S-76C Part 29 ALS Tracking (F-1.3-B)**
The Sikorsky S-76C (N76LS) compliance surface is now active. Part 29 aircraft display a "Part 29" badge to distinguish their higher-stringency compliance baseline. Certification Maintenance Requirements (CMRs) — a Part 29-specific compliance category — are grouped in a dedicated section. Dual-authority engine items display the Turbomeca Arriel 2S1 ICA authority inline. Initial ALS data entry for N76LS requires a separate session with Sandra and Marcus (see N76LS onboarding materials).

**Mandatory SI Dashboard (F-1.3-C)**
A fleet-level mandatory SI compliance panel now appears on every DOM's dashboard home. NONCOMPLIANT mandatory SIs are visible in red, immediately upon login. Per-aircraft SI boards show all active SIs with compliance window and action required. The "Mark Compliant" workflow connects SI closure to a signed work order — ensuring compliance evidence is always linked. For Bell 206B-III operators: the paper binder migration banner will help you start transferring SI records to Athelon.

**FSDO Audit Export (F-1.3-D)**
DOMs can now generate a print-formatted compliance PDF for any aircraft in seconds. The export includes: ALS compliance board, mandatory SI board, AD compliance summary, open items consolidated summary, and signed work order index with digital signature chain. Available from any aircraft's detail page or from org settings for all-aircraft export. Background generation — no waiting for large orgs.

**Repairman Certificate Employer-Transition Warning (F-1.3-E)**
When a user holding a Repairman Certificate (14 CFR §65.101(a)(1)) is offboarded from your organization or transfers to a new org, Athelon now displays a regulatory warning to DOM and admin users. The warning includes the certificate number, the legal citation, and the action required (verify with the new employer's DOM before assigning maintenance work). The certificate holder themselves does not see the warning — this is a DOM-level compliance advisory.

---

**Who this affects:**
- Lone Star Rotorcraft: All features active for N411LS, N412LS, N413LS; N76LS compliance surface now enabled pending data entry session.
- Desert Sky Turbine: FSDO Audit Export available immediately for all DST aircraft. Repairman cert warning active for personnel changes.
- Skyline Air Charter: FSDO Audit Export available for R44 fleet. SI dashboard accessible (empty by default; enter SBs as applicable).
- All organizations: Repairman certificate transition warning active.

---

**Technical notes:**
- FSDO export PDF generation is a background job (typically 5–30 seconds). Download link is valid for 24 hours.
- N76LS compliance surface is enabled but empty. Data entry session required to populate the ALS/SI boards.
- Repairman cert warning is role-scoped: visible to DOM and admin users only.
- v1.3 does not include Part 135 compliance features for Lone Star (separate gate required).

---

*Nadia Solis — Customer Success*
*Athelon v1.3 Release Notes filed: 2026-04-07*

---

## 6. Marcus Webb — Final Compliance Sign-Off

I have completed my final compliance review of all five v1.3 features.

**F-1.3-A (Bell 206B-III ALS Tracking UI):**
The ALS board correctly displays Part 27 life-limited components with their ICA-specified retirement and overhaul intervals. Templates are correctly sourced from WS27-A (23 ALS items). The urgency sort places OVERDUE items first — the correct behavior for a safety-critical display. ✅ COMPLIANT.

**F-1.3-B (S-76C Part 29 ALS Tracking UI):**
Part 29 compliance requirements are correctly distinguished from Part 27. The CMR section in the ALS board correctly identifies Certification Maintenance Requirements as a distinct FAA-approved compliance category. The dual-authority engine display correctly attributes Turbomeca Arriel 2S1 ICA items to the engine manufacturer's authority. The "Part 29" badge is not a warning — it is a regulatory identifier. ✅ COMPLIANT.

**F-1.3-C (Mandatory SI Dashboard):**
The fleet SI alert panel correctly shows NONCOMPLIANT items without including CLOSED or COMPLIANT items (confirmed by TC-1.3-C-01). The SI compliance workflow correctly requires a signed work order as evidence — no SI can be marked compliant without a signed WO. The regulatory distinction between mandatory SIs and ALS items is preserved in both the data model and the UI. ✅ COMPLIANT.

**F-1.3-D (FSDO Audit Export):**
The export template review was completed in Sprint 2. Frank's UAT found the legal name issue, which was corrected. The open items summary (Section 5) is the most important compliance element — it must include all open items without omission. TC-1.3-D-01 verified this. The data-as-of statement correctly frames the export as a snapshot of system records, not a certification of aircraft airworthiness. ✅ COMPLIANT.

**F-1.3-E (Repairman Certificate Employer-Transition Warning):**
The warning language is legally accurate: it cites §65.101(a)(1), identifies the certificate number, directs the DOM to verify — not to determine — certificate validity at the new employer. The warning is advisory, not prescriptive. It is correctly scoped to DOM and admin users. The DOM review log provides a compliance audit trail. OPEN-2C-01 is **CLOSED**. ✅ COMPLIANT.

**Overall v1.3 compliance assessment: ALL FIVE FEATURES COMPLIANT.**

I have no blocking objections to the v1.3 release. The product is delivering on its compliance promise.

**Marcus Webb — Final Compliance Sign-Off: ✅ APPROVED**
*2026-04-06*

---

## 7. Sprint 3 + Release Sign-Off

**Devraj Anand:** F-1.3-E trigger logic, warning record creation, and DOM review logging are all implemented and tested. The legal name fix (from Frank's UAT) was a straightforward data model update — `iaSignedByLegalName` now pulled from the user's certificate record rather than the display name. ✅ SIGNED — 2026-04-06

**Chloe Park:** F-1.3-E modal and persistent banner match the WS27-D spec exactly. Role gating (DOM/admin only) confirmed in TC-1.3-E-02. Sprint 3 was tight but clean. ✅ SIGNED — 2026-04-06

**Cilla Oduya:** 22/22 integration PASS. 4/4 TC-1.3-E PASS. No failures anywhere in v1.3. Sandra, Frank, and Priya all signed UAT. I'm satisfied. ✅ SIGNED — 2026-04-06

**Jonas Harker:** Production deployment complete. v1.3 is live. Background export queue, feature flags for Part 29 badge and CMR section, and Repairman warning triggers all confirmed in production. Zero errors in first 24 hours of production monitoring. ✅ SIGNED — 2026-04-07

**Nadia Solis:** Release notes sent to all three shops. Sandra's response: "Exciting. I'm booking time with Marcus for the N76LS data entry next week." Frank's response: "The export is exactly right." ✅ SIGNED — 2026-04-07

**Marcus Webb:** Final compliance sign-off on record (Section 6). OPEN-2C-01 CLOSED. v1.3 ships with a clean compliance posture. ✅ SIGNED — 2026-04-06

---

**Sprint 3 Status: ✅ COMPLETE — PASS**
**v1.3 Status: ✅ RELEASED — 2026-04-07**

*F-1.3-A: ✅ COMPLETE*
*F-1.3-B: ✅ COMPLETE*
*F-1.3-C: ✅ COMPLETE*
*F-1.3-D: ✅ COMPLETE*
*F-1.3-E: ✅ COMPLETE*
*OPEN-2C-01: ✅ CLOSED*

*Integration: 22/22 PASS*
*UAT: Sandra ✅ Frank ✅ Priya ✅*
*Marcus compliance: ✅ ALL FIVE FEATURES APPROVED*
*Production: ✅ DEPLOYED 2026-04-07*
