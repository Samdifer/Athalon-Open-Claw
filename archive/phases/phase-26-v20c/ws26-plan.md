# WS26 Plan — Phase 26: Robinson ALS Validation + Lone Star Onboarding + DST Resolution + Dispatch
**Filed:** 2026-02-23T~02:00Z  
**Owner:** Nadia Solis, Marcus Webb, Devraj Anand, Cilla Oduya, Jonas Harker, Sandra Okafor (external), Frank Nguyen (external)  
**Phase:** 26 (ACTIVE)  
**Phase 25 Gate:** ✅ GO

---

## Phase 26 Mission

Phase 25 produced four outputs that define Phase 26's scope:

1. **The Robinson ALS finding.** Sandra Okafor named it in the pre-onboarding call: main rotor blade retention bolts on the R44 are ALS items, not ADs. Marcus logged it. Phase 26 resolves it — not just for Lone Star Rotorcraft, but as a data model question for every helicopter operator Athelon will ever serve. This is WS26-A.

2. **Lone Star Rotorcraft is administratively onboarded but compliance-gated.** Sandra is live on work orders and parts traceability. The LLP dashboard, AD compliance module, and dynamic component tracking are all disabled pending Marcus's Robinson ALS audit. WS26-A gates WS26-B. This is WS26-B.

3. **DST-FB-001 is closed, but Frank's 24 flagged records need a resolution UI.** The migration correctly flagged them with `domReviewFlag: true`. Frank committed to reviewing them this week. The product needs a DOM-facing UI to complete that review. This is WS26-C.

4. **The ALS vs. AD distinction is a story worth telling.** Most MRO software gets this wrong. Miles Beaumont has the angle — from a maintenance professional who spent years chasing ADs that weren't ADs. This is WS26-D.

---

## Workstream Overview

| Workstream | Theme | Owner(s) | Gates |
|---|---|---|---|
| WS26-A | Robinson R44 ALS Validation Audit | Marcus + Tobias Ferreira + Devraj + Cilla + Jonas | None — starts immediately |
| WS26-B | Lone Star Rotorcraft Full Onboarding (Part 91 scope) | Nadia + Sandra + Marcus | WS26-A (compliance surface) |
| WS26-C | DST-FB-001 Frank Nguyen Follow-Up + Admin Resolution UI | Frank + Devraj + Cilla + Marcus | None — starts in parallel |
| WS26-D | Miles Beaumont Eighth Dispatch | Miles Beaumont | WS26-A research complete (for accuracy) |

**Parallel execution:** WS26-A and WS26-C start simultaneously. WS26-B begins Day 1 onboarding call immediately and advances Part 91 admin work; compliance surface features wait on WS26-A. WS26-D waits on WS26-A research to be accurate on the regulatory distinction.

---

## WS26-A — Robinson R44 ALS Validation Audit

**Owner:** Marcus Webb (lead), Tobias Ferreira (Robinson-qualified IA, Lone Star Rotorcraft), Devraj Anand (schema design), Cilla Oduya (test), Jonas Harker (infrastructure)  
**Output artifact:** `phase-26-v20c/ws26-a-als-validation.md`  
**Trigger:** Sandra Okafor's finding (WS25-C) — main rotor blade retention bolts are ALS items, not ADs.

---

### Background: The ALS vs. AD Distinction

This distinction is real and matters. A brief statement for the execution subagent:

**Airworthiness Directives (ADs)** are issued by the FAA under 14 CFR Part 39. They impose mandatory actions on aircraft, engines, propellers, or appliances. ADs appear in the FAA AD database, have an official AD number (e.g., 2024-15-07), and are searchable through the FAA's AD system.

**Airworthiness Limitations (ALS)** are part of the Instructions for Continued Airworthiness (ICA), which manufacturers are required to provide under 14 CFR Part 21 (and specifically for rotorcraft, §27.1529). The ALS contains mandatory replacement times, inspection intervals, and service life limits that have FAA-approved status — but they are embedded in the manufacturer's Rotorcraft Flight Manual (RFM) or maintenance manual, not in the FAA AD database.

**The compliance gap:** An MRO software product that only checks the FAA AD database will see no applicable AD for Robinson R44 main rotor blade retention bolts. Correct — there is no AD on that item. But there is a mandatory replacement interval in the R44 RFM ALS (Section 4, paragraph 4.3). A shop tracking compliance by AD database alone will see nothing on those bolts and will miss a mandatory maintenance action.

This is not an edge case. It is a systematic gap in how most MRO software approaches helicopter compliance. Sandra named it in the first call. Marcus confirmed it. The industry knows this gap exists. No one has built a product that surfaces it cleanly.

---

### Marcus's Robinson ALS Audit

Marcus will conduct the following research and document findings:

**1. R44 RFM ALS Structure**

Review the Robinson R44 Raven II RFM Section 4 (Airworthiness Limitations) in full. Document:
- Every component with a mandatory replacement or inspection interval in the ALS
- The format of each limit (hours, calendar, or dual — whichever first)
- Whether each item has a corresponding FAA AD or not
- For items with corresponding ADs: verify the AD references the ALS or the ALS is incorporated by reference
- For items without corresponding ADs: confirm the ALS-only mandatory status

Key items expected to appear in the R44 RFM ALS (non-exhaustive, Tobias will confirm):
- Main rotor blades (hours and calendar)
- Main rotor hub and spindle
- Main rotor blade retention bolts (Sandra's specific finding — ALS only, no AD)
- Tail rotor blades (hours and calendar)
- Tail rotor hub
- Drive system (belt and pulley intervals)
- Engine (per Lycoming TBO and Robinson-specific limits)
- Governor
- Rotorcraft flight manual revision currency

**2. FAA AD Database Cross-Reference**

For each ALS item, check the FAA AD database:
- Does an AD exist that covers this component?
- If yes: is the ALS compliance incorporated into the AD (i.e., does the AD mandate following the ALS)?
- If no: is the ALS-only requirement documented clearly in the scope boundary for DOM customers?

**3. Tobias Ferreira Field Interview**

Tobias Ferreira (Robinson-qualified IA, Lone Star Rotorcraft, 12+ years of R44 work) will participate in the field mapping review. Marcus contacts Tobias directly. Key questions:
- Does the R44 ALS structure match what Marcus has documented from the RFM?
- Are there ALS items that the field has seen missed due to AD-only tracking?
- What is the correct interval for main rotor blade retention bolts (hours and calendar if applicable)?
- Are there ALS items with event-based triggers (e.g., hard landing, overspeed) that are not in the standard RFM ALS table but are in supplemental Robinson documents?
- Robinson SB-99-82 (or equivalent): does any mandatory service bulletin create ALS-like requirements outside the RFM ALS section?

**4. Comparison: R44 vs. R22**

Lone Star Rotorcraft also operates an R22 (flight training partnership). Document whether the R22 ALS structure is parallel to the R44 or differs in ways that affect the data model. The data model should work for both.

---

### Devraj's alsItems Table Design

Parallel to the existing `adCompliance` data model, Devraj will design an `alsItems` table that correctly models ALS requirements. This is not the same as an AD compliance record. The differences are structural:

| Dimension | adComplianceRecords | alsItems |
|---|---|---|
| Source | FAA AD database | Manufacturer RFM/ICA ALS section |
| Regulatory authority | 14 CFR Part 39 | 14 CFR §27.1529 (rotorcraft) / manufacturer ICA |
| Reference number | FAA AD number (e.g., 2024-15-07) | ALS section + component designation (e.g., R44-ALS-4.3) |
| Interval type | Varies (hours, calendar, event) | Mandatory replacement / inspection interval per ALS |
| Override mechanism | AMOC (Alternative Method of Compliance) | FAA-approved revision to ICA; no operator AMOC equivalent |
| Compliance status | COMPLIANT / NOT_APPLICABLE / PENDING / DEFERRED / OVERDUE | WITHIN_LIMIT / DUE_SOON / OVERDUE / REPLACED (no NOT_APPLICABLE path — ALS items apply to all aircraft of that model) |
| Tracking tool | adComplianceRecords table | alsItems table (new) |

**Proposed `alsItems` schema (for Devraj to refine):**

```typescript
alsItems: defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  
  // ALS identification
  alsReference: v.string(),          // e.g., "R44-ALS-4.3" — manufacturer ALS section ref
  componentName: v.string(),         // e.g., "Main Rotor Blade Retention Bolts"
  componentPartNumbers: v.optional(v.array(v.string())), // applicable P/Ns
  aircraftMake: v.string(),          // "Robinson"
  aircraftModel: v.string(),         // "R44 Raven II"
  
  // Regulatory authority
  regulatoryBasis: v.literal("ICA_ALS"), // per 14 CFR §27.1529 (rotorcraft) or §23.1529 (fixed-wing)
  icaDocumentReference: v.string(),  // "R44 Raven II RFM Section 4, paragraph 4.3"
  icaRevision: v.string(),           // RFM revision in effect when this record was created
  
  // Interval
  intervalType: v.union(
    v.literal("HOURS"),
    v.literal("CALENDAR"),
    v.literal("HOURS_OR_CALENDAR"),  // whichever first (most common)
    v.literal("EVENT_BASED"),        // blade strike, hard landing, overspeed
    v.literal("HOURS_AND_EVENT"),    // hours limit AND event-based retirement
  ),
  intervalHours: v.optional(v.number()),
  intervalCalendarDays: v.optional(v.number()),
  eventType: v.optional(v.union(
    v.literal("BLADE_STRIKE"),
    v.literal("HARD_LANDING"),
    v.literal("OVERSPEED"),
    v.literal("OTHER"),
  )),
  
  // Current status
  currentHours: v.optional(v.number()),    // hours on this component at last replacement/inspection
  currentCalendarDate: v.optional(v.string()), // date of last replacement/inspection
  nextDueHours: v.optional(v.number()),    // due at this total hours
  nextDueDate: v.optional(v.string()),     // due by this calendar date
  
  // Compliance status
  status: v.union(
    v.literal("WITHIN_LIMIT"),
    v.literal("DUE_SOON"),           // within configurable alert threshold (e.g., 10 hours or 30 days)
    v.literal("OVERDUE"),
    v.literal("REPLACED"),           // component replaced; record closed; new record created for new component
    v.literal("RETIRED"),            // retired due to event (blade strike, etc.)
  ),
  
  // Work order linkage
  lastComplianceWorkOrderId: v.optional(v.id("workOrders")),
  lastReplacementAt: v.optional(v.string()),  // ISO timestamp
  replacedByUserId: v.optional(v.id("users")), // IA who signed off replacement
  
  // Cross-reference to AD (if any)
  relatedAdNumber: v.optional(v.string()),   // if an AD exists that references this ALS item
  adCrossReferenceNote: v.optional(v.string()), // explanation of relationship
  
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_aircraft_als_ref", ["aircraftId", "alsReference"]),
```

**Key design decisions Devraj must document:**

1. **No NOT_APPLICABLE path.** ALS items apply to all aircraft of the covered model. A Robinson R44 cannot be "not applicable" for its own ALS. If a specific ALS item doesn't apply to a particular aircraft configuration variant, that is documented in the ALS itself (e.g., R22-only vs. R44-only). The software should not allow shops to mark ALS items as not applicable.

2. **RFM revision tracking.** The `icaRevision` field is critical. Robinson periodically revises the RFM, and ALS intervals can change. When a new RFM revision is loaded, existing `alsItems` records must be reviewed to confirm the intervals are still current. This is a DOM responsibility — the system surfaces it, doesn't automate it.

3. **Event-based triggers.** A blade strike on an R44 requires immediate action regardless of hours accumulated. The `EVENT_BASED` interval type triggers a mandatory status change (from WITHIN_LIMIT to OVERDUE) when the event is recorded. Devraj should design the event-recording mechanism — likely a field on the work order or a separate event record linked to the ALS item.

4. **Parallel to adCompliance, not integrated.** The `alsItems` table is a distinct data model from `adComplianceRecords`. This is intentional: the regulatory basis is different, the compliance path is different, the override mechanism is different. Mixing them into a single table would obscure the distinction the product is trying to surface.

---

### Cilla's Test Plan (WS26-A)

Cilla will author test cases for the `alsItems` data model. Minimum required:

| Test Case ID | Description |
|---|---|
| TC-ALS-001 | Create ALS item — hours only interval |
| TC-ALS-002 | Create ALS item — hours or calendar (whichever first) |
| TC-ALS-003 | Create ALS item — event-based (blade strike) |
| TC-ALS-004 | Status transitions: WITHIN_LIMIT → DUE_SOON → OVERDUE as hours accumulate |
| TC-ALS-005 | Event trigger: recording blade strike event → ALS item status → OVERDUE immediately |
| TC-ALS-006 | Component replacement: OVERDUE → REPLACED; new ALS item record created for new component |
| TC-ALS-007 | Due-list query: generate list of OVERDUE and DUE_SOON items for an aircraft |
| TC-ALS-008 | Org isolation: ALS items in org_alpha not visible to org_bravo |
| TC-ALS-009 | No NOT_APPLICABLE path: attempt to set status to NOT_APPLICABLE → schema validation error |
| TC-ALS-010 | RFM revision change: existing alsItem retains original revision; DOM dashboard surfaces revision mismatch alert |

---

### Jonas's Documentation Task

Jonas will produce customer-facing documentation on the ALS vs. AD distinction for all current DOM customers. This is not a release note — it is an educational document. Format: a short reference guide (2–3 pages) covering:

1. What an Airworthiness Directive is (FAA Part 39, searchable in AD database)
2. What an Airworthiness Limitations section is (manufacturer ICA, embedded in RFM or maintenance manual, not in AD database)
3. Why they are tracked separately in Athelon (regulatory basis difference, compliance path difference)
4. Which aircraft types have ALS requirements that Athelon now tracks (initially Robinson R44 and R22 after WS26-A)
5. How to enter and track ALS items in Athelon (step-by-step for a DOM)
6. What to do if an ALS item is overdue (alert interpretation, escalation path)

Document goes to all current DOM customers on ship. Sandra Okafor gets a pre-release version before the wider distribution.

---

### WS26-A Success Criteria

- Marcus's Robinson ALS audit complete: all R44 ALS items documented with regulatory basis and AD cross-reference status
- Tobias Ferreira field interview complete: field mapping validated by Robinson-qualified IA
- `alsItems` table designed, implemented, and indexed
- Cilla's 10 test cases all PASS
- Jonas's documentation complete and approved by Marcus
- R44 ALS component list validated against RFM — at minimum, main rotor blade retention bolts confirmed as ALS-only (no AD)
- Marcus compliance sign-off on the data model

---

## WS26-B — Lone Star Rotorcraft Full Onboarding (Part 91 Scope)

**Owner:** Nadia Solis (onboarding lead), Sandra Okafor (DOM, Lone Star Rotorcraft), Marcus Webb (compliance gate)  
**Output artifact:** `phase-26-v20c/ws26-b-loneStar-onboarding.md`  
**Gate dependency:** WS26-A required before enabling compliance-surface features (LLP dashboard, AD compliance, dynamic component tracking)

---

### Day 1 Onboarding Call

**Lead:** Nadia Solis  
**Participants:** Nadia, Sandra Okafor  
**Objective:** Complete aircraft roster, collect N-numbers, open first substantive work order. Mark Lone Star Rotorcraft as Day 1 operationally active (admin onboarding was Phase 25; Day 1 is the first real work session).

**Agenda:**

1. **Aircraft roster finalization.** Sandra's fleet is known from the pre-onboarding call:
   - Bell 206B-III JetRanger × 2 (N-numbers TBD from Sandra)
   - Robinson R44 Raven II × 2 (N-numbers TBD)
   - Sikorsky S-76C × 1 (corporate charter, Part 91)
   - R22 × 1 (flight training partnership — verify whether this is on Lone Star's certificate or the training partner's)

   *Note: Phase 25 artifact listed "Bell 206B × 2" and "R44 × 3"; the Phase 26 execution subagent should treat Sandra's Day 1 confirmation as canonical for fleet composition. The S-76C is new information from the Phase 26 brief — surface it on Day 1 and update records accordingly.*

2. **N-number collection and aircraft record completion.** For each aircraft:
   - Tail number (N-number)
   - Serial number
   - Year of manufacture
   - Current TTSN (total time since new)
   - Confirm date of last annual/100-hour

3. **First work order.** First substantive work order: 100-hour inspection on Bell 206B-III. N-number TBD from Sandra. Task cards should be loaded generically — Part 91 admin only. No compliance-surface features (no AD compliance check, no LLP tracking, no dynamic component tracking). The 100-hour is an owner-directed maintenance interval for Part 91 operators, not a regulatory requirement on a rotorcraft without a Part 135 inspection program.

4. **Scope boundary reconfirmation.** Sandra knows the scope from the pre-onboarding call. Nadia confirms it again on Day 1: Part 91 administrative work only. The following features are not active for Lone Star Rotorcraft:
   - AD compliance module (Bell SI gap on file, Marcus's acknowledgment required before activation)
   - LLP dashboard / ALS tracking (pending Robinson validation, WS26-A)
   - Dynamic component retirement tracking (pending Robinson validation)
   - Part 27 regulatory citation templates (pending Marcus data entry post-audit)

5. **Bell SI gap reconfirmation.** The Bell mandatory service instruction gap is on file from Phase 25. For the Bell 206B-III work, Sandra continues to track Bell mandatory SIs in her existing process (outside Athelon). This is documented. Athelon is not the compliance tool for Bell SI items until Phase 26 Bell SI tracking ships.

**Deferred pending Marcus's Bell SI audit (named gap from pre-sales call):**
The Bell SI supplemental tracking layer is not in scope for Phase 26 WS26-B. It is a Phase 26 research item (Marcus and Devraj design). Nadia documents which Lone Star Rotorcraft operational needs are Part 91 admin only vs. which are deferred pending the Bell SI audit, and records this in the WS26-B artifact.

---

### S-76C Note

The Sikorsky S-76C operating under Part 91 for corporate charter adds a new aircraft type. The S-76C is a Part 29 (Transport Category Rotorcraft) aircraft. This is a different certification basis than the R44 (Part 27). Marcus should note in WS26-B whether the S-76C creates any Part 29-specific compliance considerations beyond what is already addressed in the Part 91 admin scope.

At minimum: confirm that Part 91 administrative work (work orders, task cards, parts, sign-offs) works for an S-76C the same as it works for an R44. It should — the work order structure is aircraft-agnostic. But Marcus should state this explicitly in the WS26-B artifact.

---

### Nadia's Debrief (Part of the Artifact)

WS26-B closes with Nadia's debrief. Specific items to capture:
- Lone Star Rotorcraft is the fifth shop onboarded on Athelon
- This is the first helicopter MRO
- First time Athelon has had an S-76C in its records (Part 29 aircraft)
- First time a DOM had 19 years of aviation experience going into onboarding — what was different about the onboarding experience?
- First work order on a Bell 206B-III: what worked, what needed adjustment?
- What is Nadia's read on Sandra's confidence in the product so far?
- What is the compliance-surface unlock timeline (WS26-A gate) and how does Nadia communicate that to Sandra?

---

### WS26-B Success Criteria

- Aircraft roster complete with N-numbers and serial numbers for all Lone Star aircraft
- Aircraft records updated in Athelon production
- First work order (100-hour, Bell 206B-III) created and worked
- Scope boundary reconfirmed and documented — Part 91 admin scope, compliance-surface items deferred
- Bell SI gap reconfirmed on record
- S-76C noted with Marcus's Part 29 statement
- Nadia debrief filed

---

## WS26-C — DST-FB-001 Frank Nguyen Follow-Up (Desert Sky Turbine)

**Owner:** Frank Nguyen (review), Devraj Anand (admin UI), Cilla Oduya (regression), Marcus Webb (compliance review of resolution protocol)  
**Output artifact:** `phase-26-v20c/ws26-c-dst-resolution.md`  
**Gate dependency:** None — starts in parallel with WS26-A

---

### Background

DST-FB-001 shipped in Phase 25. The migration flagged 47 records across 4 orgs as `domReviewFlag: true`. Desert Sky Turbine (Frank Nguyen's org) has 24 of the 47. Frank committed to reviewing the 24 records this week. He expects most to be `NOT_APPLICABLE_BY_MODEL` (piston ADs on a turbine import from a prior shop). Some may be legitimate DOM determinations that need a supporting reference attached. A few might be real data gaps.

The DOM dashboard currently shows these 24 records in the "Applicability Review Required" panel with the migration flag note. But the DOM has no UI to act on them — no way to apply a correct basis, no way to mark for re-inspection, no way to clear the flag. That UI ships in WS26-C.

---

### Frank's Review

Frank Nguyen will review all 24 flagged records and categorize them:

**Category 1: Correct NOT_APPLICABLE — basis known, update needed**  
These are the piston ADs that don't apply to a turbine engine. Frank knows the basis. The correct action: apply the correct `nonApplicabilityBasis` enum value (likely `NOT_APPLICABLE_BY_MODEL`) and add a `nonApplicabilityNotes` reference (e.g., "FAA AD applicability: Lycoming/Continental engines only; Desert Sky Turbine fleet: Pratt & Whitney Canada PT6A"). Clear the `domReviewFlag`.

**Category 2: DOM determination — supporting reference needed**  
These are determinations that Frank made as DOM but without documenting the supporting reference. The basis is `NOT_APPLICABLE_DOM_DETERMINATION`. The correct action: add the DOM memo reference or AMOC reference in `nonApplicabilityNotes`. Clear the `domReviewFlag`.

**Category 3: Real data gap — flag for shop review**  
These are records where the NOT_APPLICABLE determination was made by the prior shop (pre-Frank's tenure as DOM at Desert Sky) and there is no defensible basis Frank can document. The correct action: flag for re-inspection. NOT silently deleted. Remains in the record with a clear status indicating the determination is under review.

Frank will report: how many records fall into each category, and which specific AD numbers fell into Category 3. This is the input to Devraj's admin resolution UI.

---

### Devraj's Admin Resolution UI

**Scope:** DOM-only screen. Not visible to A&P mechanics or viewers. Accessible to users with `admin` or `view_compliance` + `close_work_order` permissions (or a new `dom_compliance_review` permission — Marcus to specify).

**UI design:**

**Screen: "Flagged Record Review" (DOM dashboard → Compliance → Flagged Records)**

Lists all records with `domReviewFlag: true`. Columns: AD number, AD title, current status (`NOT_APPLICABLE`), current basis, migration note, aircraft.

For each record, the DOM has three actions:

1. **Apply Basis** — dropdown to select the correct `nonApplicabilityBasis` value, plus a text field for `nonApplicabilityNotes`. On save: `nonApplicabilityBasis` updated, `nonApplicabilityNotes` updated, `domReviewFlag` cleared, `domReviewClearedAt` and `domReviewClearedBy` recorded.

2. **Mark for Re-Inspection** — sets a new field `requiresReinspection: true` and records reason. Does NOT clear `domReviewFlag`. Instead, changes the flag display from "Review Required" to "Re-Inspection Scheduled." The record appears in a separate "Re-Inspection Required" panel with a different visual treatment. DOM must link a resolution work order to clear this state.

3. **Escalate to DOM Memo** — for Category 2 records where the DOM needs to create a formal determination memo before clearing the flag. Opens a guided memo-drafting template. On memo creation: `nonApplicabilityBasis` set to `NOT_APPLICABLE_DOM_DETERMINATION`, memo reference attached to `nonApplicabilityNotes`, `domReviewFlag` cleared.

**Mutation signatures (Devraj to implement):**

```typescript
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
    // Auth: DOM-only (admin or dom_compliance_review permission)
    // Org-scoped: orgId from Clerk auth, not args
    // On APPLY_BASIS: update basis, clear flag, record reviewer and timestamp
    // On MARK_FOR_REINSPECTION: set requiresReinspection: true, record reason and timestamp
    // On ESCALATE_TO_MEMO: create memo template record, return memo ID for drafting
  },
});
```

---

### Cilla's Regression: DST-FB-001 Remains Closed

After the admin resolution UI ships, Cilla runs the original DST-FB-001 test cases to confirm the fix is intact:

- TC-DST-001: Null basis still hard-blocks save ✅
- TC-DST-002: All four enum values still accepted ✅
- TC-DST-003: Migration-flagged records now accessible via resolution UI ✅ (new)

New test cases for the resolution UI:

| Test Case | Description |
|---|---|
| TC-DST-004 | DOM applies basis to flagged record → flag cleared, basis updated, reviewer logged |
| TC-DST-005 | DOM marks record for re-inspection → flag NOT cleared, requiresReinspection set, reason recorded |
| TC-DST-006 | A&P mechanic (non-DOM) cannot access flagged record review screen |
| TC-DST-007 | Resolution via memo template → basis set to DOM_DETERMINATION, memo reference in notes |
| TC-DST-008 | After all 24 DST records resolved → Applicability Review Required panel shows 0 for DST org |

---

### WS26-C Success Criteria

- Frank's review complete: 24 records categorized (Category 1/2/3)
- Admin resolution UI shipped and accessible to DOM only
- Devraj's `resolveAdComplianceFlag` mutation implemented
- Cilla's regression: DST-FB-001 test cases still PASS
- Cilla's new test cases TC-DST-004 through TC-DST-008: all PASS
- Marcus compliance review of resolution protocol: PASS
- Records without defensible basis are flagged for re-inspection — not silently deleted
- WS26-C artifact filed: `phase-26-v20c/ws26-c-dst-resolution.md`

---

## WS26-D — Miles Beaumont Eighth Dispatch

**Owner:** Miles Beaumont  
**Output artifact:** `phase-26-v20c/dispatches/dispatch-26-als-vs-ad.md`  
**Gate dependency:** WS26-A research should be complete (or substantially advanced) so the regulatory distinction is accurate

---

### Dispatch Theme

The distinction between Airworthiness Limitations (ALS) and Airworthiness Directives (ADs) — what it means for helicopter operators, why most MRO software gets it wrong, and what Athelon is doing about it.

**Written from the perspective of a maintenance professional who spent years chasing ADs that weren't ADs.**

---

### Framing Notes for Miles

The narrative entry point is the maintenance professional's experience: you run the AD search. Nothing comes up. So you move on. Except the item was mandatory — it just lived in the RFM, not in the AD database. The tool gave you a false negative, not because the software was broken, but because the tool was searching the wrong place.

This is not hypothetical. It is the systematic gap that Sandra Okafor named on a pre-onboarding call and that Marcus had not fully enumerated in his Part 27 audit documentation. A helicopter IA who has been doing R44 annuals for twelve years — Tobias Ferreira — could walk you through the blade retention bolt interval from memory and tell you whether the AD database returns anything on it. It doesn't. The mandatory interval lives in the RFM.

**Secondary thread:** Why the industry settled for this. The FAA AD database is a known, standardized source. Building compliance tools around it is rational — it's one database, it's searchable, it has an official format. The ALS is manufacturer-specific, revision-tracked, embedded in a document that comes with the aircraft when new and gets revised by service bulletin and RFM amendment thereafter. Tracking it requires reading the actual document. Software would rather search a database.

**The Athelon response:** Separate data models. `alsItems` is not an `adComplianceRecords` entry with a different label. It is a distinct table with a distinct regulatory basis, distinct compliance path, and distinct override mechanism (none — there is no operator AMOC equivalent for ALS compliance). The distinction is enforced in the architecture, not just in the documentation.

**Closing note:** Sandra ran a test on the pre-onboarding call. She asked about the main rotor blade retention bolts. If Marcus had said "we track that as an AD," she would have known he didn't understand the regulatory landscape. He hadn't heard of the specific item yet. He said he'd look into it. She decided that was an acceptable answer. Twelve weeks later, Athelon has an `alsItems` table.

**Tone:** Direct. No hype. Written for a maintenance professional who has been told by vendors for years that their software covers everything. It doesn't. This one has a specific list of what it covers and what it doesn't, and it built a new data model rather than papering over the gap.

---

### WS26-D Success Criteria

- Dispatch filed at `phase-26-v20c/dispatches/dispatch-26-als-vs-ad.md`
- Regulatory distinction (ALS vs. AD) is accurate per Marcus's WS26-A findings
- Tobias Ferreira's perspective as a Robinson-qualified IA is represented (Miles may interview or synthesize from the WS26-A interview record)
- Sandra's pre-onboarding call moment is present in the narrative
- Honest about what Athelon covers and what remains in progress

---

## Phase 26 Sequencing

```
Week 1:
  WS26-A starts: Marcus contacts Tobias Ferreira, begins R44 RFM ALS review
  WS26-B Day 1 call: Nadia + Sandra — aircraft roster, N-numbers, first work order
  WS26-C starts: Frank begins 24-record review

Week 2:
  WS26-A continues: Tobias field interview, AD database cross-reference
  WS26-B: WO-LSR-002 (100-hour Bell 206B-III) opened
  WS26-C: Frank's categorization complete; Devraj begins admin resolution UI

Week 3:
  WS26-A: Devraj builds alsItems table; Cilla writes test cases
  WS26-C: Admin resolution UI shipped; Cilla regression run; Frank resolves all 24 records
  WS26-D: Miles begins dispatch (WS26-A research substantially complete)

Week 4:
  WS26-A: Test cases run; Jonas documentation complete; Marcus compliance sign-off
  WS26-B: Compliance surface features enabled for Lone Star Rotorcraft (after WS26-A GO)
  WS26-C: WS26-C artifact filed
  WS26-D: Dispatch filed

Phase 26 gate review: Week 4 or 5.
```

---

## Gate Dependencies for Phase 27

The following items from Phase 26 will gate Phase 27 scope:

1. **WS26-A must PASS** before compliance surface features are enabled for Lone Star Rotorcraft (WS26-B gate).
2. **WS26-A must PASS** before Phase 27 can scope Bell 206B-III dynamic component tracking (the Bell SI supplemental tracking layer is a separate workstream, likely Phase 27).
3. **WS26-C must PASS** (DST-FB-001 admin resolution UI, Frank's 24 records resolved) before Phase 27 can consider Desert Sky Turbine's FSDO audit readiness.
4. **WS26-B debrief** will inform Phase 27 scope expansion — Sandra's feedback on the first month of helicopter MRO operations on Athelon.

---

## Team Assignments

| Person | Role | WS26 Work |
|---|---|---|
| Marcus Webb | Compliance Officer | WS26-A (Robinson ALS audit lead), WS26-B (compliance gate sign-off), WS26-C (resolution protocol review) |
| Devraj Anand | Implementation | WS26-A (alsItems schema + implementation), WS26-C (admin resolution UI) |
| Cilla Oduya | QA | WS26-A (test cases), WS26-C (regression + new test cases) |
| Jonas Harker | Infrastructure + Documentation | WS26-A (DOM customer documentation on ALS vs. AD) |
| Nadia Solis | Onboarding Lead | WS26-B (Day 1 call, debrief) |
| Sandra Okafor | External — Lone Star DOM | WS26-B (aircraft roster, first work order, fleet confirmation) |
| Tobias Ferreira | External — Robinson-qualified IA | WS26-A (field interview, ALS field mapping validation) |
| Frank Nguyen | External — Desert Sky Turbine DOM | WS26-C (24-record review and categorization) |
| Miles Beaumont | Dispatch | WS26-D |

---

*WS26 Plan filed. Phase 26 is active.*  
*Filed: 2026-02-23T~02:00Z*
