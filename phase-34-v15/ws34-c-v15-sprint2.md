# WS34-C — v1.5 Sprint 2: F-1.5-C Procurement Subfields + F-1.5-D Regulatory Change Tracking Phase 1 + F-1.5-E Cross-Shop Protocol Sharing Foundation
**Workstream:** WS34-C
**Phase:** 34 / v1.5
**Sprint:** v1.5 Sprint 2
**Release:** v1.5.0-sprint2 (2026-09-19)
**Owner:** Devraj Anand (engineering lead), Cilla Oduya (QA)
**Supporting:** Marcus Webb (compliance review); Chloe Park + Finn Calloway (UI); Jonas Harker (release gate)
**UAT:** Curtis Pallant (Ridgeline), Lorena Vásquez (HPAC), Dale Renfrow (RMTS), Frank Nguyen (High Desert MRO)
**Status:** ✅ DONE — v1.5.0-sprint2 shipped 2026-09-19; all 46 TCs PASS; Marcus compliance clearance ✅; Jonas release gate ✅; all 8 shops deployed

---

## §1. Sprint 2 Context

v1.5 Sprint 1 had shipped cleanly on 2026-08-11 — two features, 198 TCs, zero incidents, all eight shops on the new version within forty-eight hours of release. The standard had been set. Sprint 2 was going to be harder.

Sprint 2 carries three threads that are not equivalent in size or risk:
- **F-1.5-C (Procurement Subfields):** Low engineering risk. Additive schema change on an existing WO type. UI work for Chloe and Finn. The feature request that came from Curtis's WO-RDG-003 experience, confirmed by Lorena's OI-33-02 procurement workflow in Phase 34. Small, useful, owed to the field.
- **F-1.5-D Phase 1 (Regulatory Change Tracking — AD API + applicability layer):** Medium-large engineering risk. The first external API integration in Athelon's history. FAA AD data is not uniformly structured. The applicability matching algorithm has to be fast, accurate enough to be useful, and *clearly* bounded as a notification layer rather than a compliance determination — that boundary is Marcus's insistence and it is non-negotiable.
- **F-1.5-E Foundation (Cross-Shop Protocol Sharing):** Medium engineering risk. Schema extension, admin UI for Marcus. The first step toward something Dale Renfrow has been asking for since Phase 32.

Devraj's pre-sprint estimate: F-1.5-C ships clean. F-1.5-D Phase 1 is the sprint's critical path. F-1.5-E foundation is a clean schema job, risk is low.

Sprint 2 opened 2026-08-25. Ship target: 2026-09-19 (Jonas release gate day).

---

## §2. F-1.5-C — Procurement Workflow Status Subfields

### §2.1 Feature Motivation (FR-33-01)

FR-33-01 was logged on 2026-08-10 by Marcus Webb after reviewing WO-RDG-003 — the work order Curtis Pallant had opened for N4421T Power Turbine Inlet Housing procurement. The WO's notes field contained:

> *"PO issued 8/10. Pacific Turbine. Part P/N 3053174 overhauled, 0 SMOH expected. ETA 9/20 per Angela. 8130-3 required. — CPC"*

Marcus's note to Devraj: *"This is good procurement hygiene but it's free-form. When I'm reviewing this under audit, I need to be able to see structured procurement status — PO number, supplier, expected delivery, 8130-3 receipt status. Right now it's in a text note and I have to parse it."*

The feature request was: add structured procurement subfields to Procurement-type work orders to replace the free-text tracking pattern.

By Sprint 2, the need had been validated by a second data point: Lorena's OI-33-02 procurement for WO-HPAC-002. She typed her PO number, supplier name, and expected delivery date into WO notes on 2026-09-05. Phase 34 ran two simultaneous procurement workflows on two WOs at two shops. Marcus was managing compliance review for both. The absence of structured fields was a two-shop problem by the time Sprint 2 shipped.

### §2.2 Schema Design (2026-08-25 through 2026-08-28)

Devraj added procurement subfields to the `workOrders` schema in Convex. The new fields are gated on `workOrderType === "PROCUREMENT"`:

```typescript
// Procurement subfields (only surfaced for PROCUREMENT type WOs)
inquiryStatus: v.optional(
  v.union(
    v.literal("NOT_STARTED"),
    v.literal("IN_PROGRESS"),
    v.literal("QUOTES_RECEIVED"),
    v.literal("APPROVED")
  )
),
poNumber: v.optional(v.string()),
expectedDelivery: v.optional(v.number()), // Unix timestamp
supplierName: v.optional(v.string()),
eightThirtyStatus: v.optional(
  v.union(
    v.literal("NOT_RECEIVED"),
    v.literal("EXPECTED"),
    v.literal("RECEIVED"),
    v.literal("VERIFIED")
  )
),
deliveryNotes: v.optional(v.string()),
```

**ALS card inline procurement display:** When a Procurement WO is linked to a DUE_SOON ALS item, and the WO has `poNumber` and `expectedDelivery` populated, the ALS item card shows a structured procurement status line beneath the cycle/hours remaining indicator:

```
🔧 PO-RDG-PTH-001 · Pacific Turbine Parts · Expected 2026-09-20 · 8130-3: VERIFIED
```

If the WO has only `inquiryStatus: IN_PROGRESS`, it shows:

```
🔧 Procurement in progress · No PO yet
```

This replaces the plain-text WO number link that previously appeared on the ALS card.

**FSDO Export update (F-1.5-A open discrepancy list integration):** The FSDO Audit Export open discrepancy list section (added in Sprint 1) now renders procurement WOs with their structured subfield data: PO number, supplier, expected delivery, and 8130-3 status. An auditor looking at a shop's FSDO export can see not just that a life-limited part is DUE_SOON, but exactly what procurement action is in progress, what PO is open, when the part is expected, and whether the 8130-3 has been received and verified.

**FR-33-02 (FSDO Export cover page date range):** A minor fix bundled with this thread — the FSDO Export cover page now shows the correct date range for the export period. Previously the start date defaulted to the system epoch. Finn Calloway fixed this in forty minutes.

**FR-33-03 (Mobile pin drag handle sizing):** The drag handle on pinned aircraft cards on the mobile home screen was too small for reliable tap-and-drag on older iPhone models (Marcus's iPhone SE, Frank Nguyen's Galaxy A-series). Finn increased the touch target size per iOS/Material accessibility guidelines. One day of work, two field complaints resolved.

### §2.3 UI Build (2026-09-01 through 2026-09-08)

Chloe Park built the WO form update. The procurement subfield section appears below the standard WO fields when `workOrderType === "PROCUREMENT"`, collapsible for users who prefer not to see it. Chloe added a tooltip on the `8130-3Status` field that explains the four states in plain language: *"NOT_RECEIVED = no 8130-3 yet; EXPECTED = supplier confirmed 8130-3 will accompany part; RECEIVED = 8130-3 in hand, not yet reviewed; VERIFIED = reviewed and compliant."* Marcus wrote the tooltip copy.

Finn built the ALS card inline display component. He proposed a colored status badge on the procurement line — amber if no PO, green if PO+delivery date set, blue if 8130-3 VERIFIED. Cilla had a QA comment: *"The color coding is intuitive but it needs to be distinguishable from the ALS DUE_SOON/OVERDUE/COMPLIANT status coloring to avoid confusion."* Finn revised to use distinct iconography (wrench icon vs. calendar icon) rather than relying solely on color.

### §2.4 UAT: Curtis Pallant (2026-09-10)

Curtis Pallant was the designed UAT lead for F-1.5-C — he had created the original feature request, in practice if not in name, and his WO-RDG-003 was the reference case.

Devraj sent Curtis a staging environment link on 2026-09-09. Curtis opened WO-RDG-003 on staging and used it to backfill the procurement subfields:

- `poNumber`: PO-RDG-PTH-001
- `expectedDelivery`: 2026-09-20
- `supplierName`: Pacific Turbine Parts
- `8130-3Status`: VERIFIED (part already received by staging test date)
- `deliveryNotes`: "0 SMOH. PTP-PTH-20244. 8130-3 on file at KRTS. Pre-install clearance issued 9/22."

He navigated to the N4421T ALS board and saw the PTH-01 card with the procurement status line:

```
🔧 PO-RDG-PTH-001 · Pacific Turbine Parts · Expected 2026-09-20 · 8130-3: VERIFIED
```

His response: *"That's the information I want to see when I look at the card. I don't want to open the WO to find out whether the 8130-3 is here. It should just tell me."*

**Curtis UAT:** ✅ APPROVED

### §2.5 UAT: Lorena Vásquez (2026-09-12)

Lorena ran UAT on WO-HPAC-002 (OI-33-02 N521HPA Stator procurement). She used the new subfields to update the WO she'd been tracking manually:

- `inquiryStatus`: APPROVED → she found the new "APPROVED" state cleaner than what she'd typed before
- `poNumber`: PO-HPAC-002-A
- `expectedDelivery`: 2026-09-15
- `supplierName`: Pacific Turbine Parts
- `8130-3Status`: EXPECTED

The N521HPA ALS board card for HPAC-K1-PTS-01 now showed:

```
🔧 PO-HPAC-002-A · Pacific Turbine Parts · Expected 2026-09-15 · 8130-3: EXPECTED
```

Lorena: *"This is what I asked about in August. Good. Can you also add a field for the core tracking? I have a $8,500 core deposit outstanding and I need to know when to return the old unit."*

Devraj logged that as FR-34-01 (core deposit tracking subfield) — candidate for Sprint 3.

**Lorena UAT:** ✅ APPROVED

### §2.6 F-1.5-C Test Results (Cilla Oduya)

**Test plan:** 16 TCs (increased from planned 14 based on UAT-generated edge cases)

| TC | Description | Result |
|---|---|---|
| TC-F15C-001 | Procurement subfields absent for non-PROCUREMENT WO types | ✅ PASS |
| TC-F15C-002 | Procurement subfields visible and editable for PROCUREMENT WO type | ✅ PASS |
| TC-F15C-003 | `poNumber` stored and retrieved correctly | ✅ PASS |
| TC-F15C-004 | `expectedDelivery` date picker + storage | ✅ PASS |
| TC-F15C-005 | `supplierName` free text field | ✅ PASS |
| TC-F15C-006 | `8130-3Status` all four states cycle correctly | ✅ PASS |
| TC-F15C-007 | `deliveryNotes` free text | ✅ PASS |
| TC-F15C-008 | ALS card shows procurement line when `poNumber` + `expectedDelivery` set | ✅ PASS |
| TC-F15C-009 | ALS card shows "procurement in progress" when only `inquiryStatus` set | ✅ PASS |
| TC-F15C-010 | ALS card shows no procurement line when WO is not linked to ALS item | ✅ PASS |
| TC-F15C-011 | FSDO Export open discrepancy list renders procurement subfields | ✅ PASS |
| TC-F15C-012 | Existing WO open/close workflow unchanged (no regression) | ✅ PASS |
| TC-F15C-013 | FR-33-02 FSDO Export cover page date range correct | ✅ PASS |
| TC-F15C-014 | FR-33-03 Mobile pin drag handle touch target ≥44px (iOS standard) | ✅ PASS |
| TC-F15C-015 | ALS card procurement display color scheme distinct from ALS status colors | ✅ PASS |
| TC-F15C-016 | Schema migration clean — zero errors on all 8 shop datasets | ✅ PASS |

**16/16 PASS.** Cilla: *"Clean feature. The ALS card inline procurement display is the best UX in this sprint. Simple and right."*

---

## §3. F-1.5-D — Regulatory Change Tracking Phase 1 (AD API + Applicability Layer)

### §3.1 Context: The CRITICAL Feature

When Nadia ran the v1.5 scoping session in Phase 32, she asked Marcus to rank the features by compliance impact. He put Regulatory Change Tracking first, without hesitation.

*"Right now, if the FAA issues a new AD for a PT6A-42 tomorrow morning, Lorena Vásquez doesn't find out until she reads the AD Biweekly, or until her FSDO examiner mentions it, or until she happens to look at the FAA website. That's the gap. The platform knows the aircraft. It knows the engine. It should tell her."*

The v1.5 scoping session had ranked this as CRITICAL — the highest compliance impact item in the entire v1.5 backlog, and the largest engineering effort. Phase 1 was never intended to be the complete feature. It was intended to be the foundation that Sprint 3 would build on.

Phase 1 scope (Phase 34): FAA AD API integration, aircraft applicability matching, alert distribution layer.
Phase 2 scope (Sprint 3): SB/revision tracking, full DOM confirmation workflow, ALS item update from confirmed AD.

### §3.2 FAA AD API Integration Spike (Devraj Anand, 2026-08-25 through 2026-09-01)

The FAA maintains the AD database at the FAA ADDB endpoint: `https://drs.faa.gov/drsdocdata/...`. The official query API for programmatic AD consumption is the FAA ADQS (Airworthiness Directive Query Service). Devraj had been researching the API since the v1.5 scoping session.

The integration challenges:
1. **AD applicability statements are semi-structured text.** The "Aircraft" applicability field in an AD record is a natural-language statement like: *"Pratt & Whitney Canada (P&WC) PT6A-42 series turboprop engines, all S/Ns, installed in Beechcraft Super King Air 200 (Model B200) and 300 series aircraft."* Parsing this for keyword matching requires handling varied phrasings.
2. **New vs. amended ADs.** An amended AD revises an existing AD's compliance requirements. The alert system must distinguish a brand-new AD (no prior record in Athelon) from an amendment to an AD the DOM has already reviewed.
3. **Rate limiting and caching.** The FAA ADQS endpoint has rate limits. Athelon needs to cache AD records and sweep for new/amended ADs on a reasonable schedule (daily).

**Devraj's integration architecture (finalized 2026-09-01):**

```
FAA ADQS API
    │
    ▼
AD Ingestion Cron (daily sweep, 06:00 UTC)
    │  - Fetches ADs issued/amended in past 24h
    │  - Deduplicates against adRecords table
    │  - Stores new/amended ADs in adRecords
    │
    ▼
adRecords table
    │  { adNumber, effectiveDate, applicabilityText,
    │    aircraftKeywords[], engineKeywords[], status: NEW|AMENDED|DISMISSED }
    │
    ▼
Applicability Matching Engine
    │  - Runs after each AD ingestion batch
    │  - For each new/amended AD:
    │    - Extracts keywords: make, model, engine type, engine series
    │    - Fuzzy matches against aircraftRecords: (type, engineType, engineSeries)
    │    - Flags potential matches as POSSIBLE_APPLICABLE
    │
    ▼
Alert Distribution Layer
    │  - For each POSSIBLE_APPLICABLE match:
    │    - Generates in-app notification for shop's DOM
    │    - Adds to DOM's daily email digest (if enabled)
    │    - Notification payload: { adNumber, adTitle, applicabilityText,
    │                              matchedAircraft: [{ tailNumber, type, engine }],
    │                              confidence: "keyword-match" }
    │
    ▼
DOM Confirmation Interface
       - DOM sees: AD summary + matched aircraft + applicability text
       - DOM actions: CONFIRM APPLICABLE | DISMISS (not applicable) | FLAG FOR REVIEW
       - CONFIRM APPLICABLE → AD added to aircraft's AD compliance board (status: ACTION_REQUIRED)
       - DISMISS → dismissed with optional rationale (e.g., "Engine S/N not in effectivity range")
       - FLAG FOR REVIEW → queues for Marcus's compliance team review
```

**Boundary rule (Marcus, non-negotiable):** The applicability matching result is a `confidence: "keyword-match"` signal. The UI must display the label: *"This AD may apply to your aircraft based on type and engine match. Review the AD applicability statement in full before confirming."* It cannot say "This AD applies." The legal determination of applicability belongs to the DOM / IA, not the platform.

Marcus wrote the disclaimer language for the notification interface on 2026-09-08:

> *"Athelon has identified AD [AD Number] as a possible match for [tail number] ([aircraft type], [engine type/series]). This notification is based on keyword matching of the AD applicability statement against your fleet records — it is not a legal determination of applicability. You must review the full AD text, including the exact aircraft effectivity and serial number ranges, before determining whether this AD applies to your specific aircraft. Dismiss this notification only if you have reviewed the full AD text and confirmed it does not apply."*

Cilla added this language as a TC requirement: *"Disclaimer text must appear verbatim in every POSSIBLE_APPLICABLE notification."*

### §3.3 Applicability Matching Engine (Devraj, 2026-09-01 through 2026-09-08)

The matching engine is a two-pass keyword extraction and comparison system:

**Pass 1 — AD keyword extraction:**
The AD's `applicabilityText` field is parsed for: aircraft manufacturer (e.g., "Beechcraft", "Cessna"), aircraft model (e.g., "King Air B200", "208B", "421C"), engine manufacturer (e.g., "Pratt & Whitney Canada", "P&WC", "Continental"), engine series (e.g., "PT6A-42", "GTSIO-520-L", "PT6A-114A"), part number or S/N ranges (pattern matched).

**Pass 2 — Fleet matching:**
For each aircraft in the Athelon fleet (8 shops, ~60 aircraft at Phase 34), the engine compares extracted keywords against `aircraftRecords.type`, `aircraftRecords.engineType`, and `aircraftRecords.engineSeries`. Match conditions:
- Any two of {manufacturer, model, engine series} co-occurring in the same AD → POSSIBLE_APPLICABLE
- Single match on engine series (e.g., "PT6A-42") → POSSIBLE_APPLICABLE with lower confidence label
- Zero matches → no alert

**Known false-positive handling:** Devraj built a dismissal memory layer. If a DOM dismisses an AD with rationale "S/N not in effectivity range," that dismissal rationale is stored alongside the AD record. If the same AD is amended (Phase 2 will handle amendment re-alerting), the prior dismissal is shown in context so the DOM can reassess.

Cilla's review of the matching engine: *"The false positive rate will be non-trivial. The applicability text is not standardized. An AD for PT6A-42 engines might say 'PT6A-42,' 'PT6A-42A,' 'PT6A-42B,' or 'PT6A-42 series' — and might not apply to all three sub-variants. The keyword matcher will flag all four for any PT6A-42 operator. That's intentional, but we need to be transparent in the UI about why the match fired."*

Cilla logged this as a Sprint 3 refinement: add the matched keyword(s) to the notification payload so the DOM can see why the alert fired. Approved by Devraj as a Sprint 3 addition.

### §3.4 Alert Distribution Layer (Chloe Park, 2026-09-08 through 2026-09-12)

Chloe built the in-app notification interface for the AD alert. Design decisions:
- AD alerts appear in a dedicated "Regulatory Alerts" section in the DOM's home screen (distinct from maintenance notifications)
- Unreviewed alerts are highlighted with a red badge count on the navigation bar
- The notification card shows: AD number + title, effective date, applicability text (scrollable), matched aircraft list
- Action buttons: CONFIRM APPLICABLE | DISMISS | FLAG FOR REVIEW
- On CONFIRM: the user is prompted to confirm they have read the full AD applicability statement (one additional confirmation tap)
- On DISMISS: optional free-text rationale field (e.g., "S/N not in effectivity range — reviewed full text 2026-09-21")
- Marcus's disclaimer text appears at the top of every unreviewed alert card, in gray italic text, above the action buttons

Finn built the email digest integration — a daily email (configurable: daily, weekly, or off) that lists new AD alerts and links to the in-app review interface.

### §3.5 Phase 1 Live Validation — AD Test Against Current Fleet

Before UAT, Devraj ran the Phase 1 system against the current Athelon fleet (all 8 shops, ~60 aircraft) using the FAA ADQS for the preceding 90 days of AD activity. The purpose was to calibrate false positive rate and verify that known relevant ADs were surfacing.

**Results from 90-day validation run (2026-09-12):**
- ADs ingested: 847
- POSSIBLE_APPLICABLE matches generated: 23 across 14 aircraft records
- Obvious true positives (confirmed by Marcus spot-check): 9
- Obvious false positives (engine series keyword matched but effectivity excludes specific S/N ranges): 11
- Ambiguous (requires full DOM review): 3
- False negative (missed a known applicable AD): 0 (Marcus reviewed all ADs affecting known fleet types in the 90-day window and confirmed none were missed)

Marcus's assessment: *"False positive rate is acceptable for Phase 1. We're alerting broadly and letting the DOM filter. The important thing is the false negative rate: zero. We are not missing ADs. We may be flagging things that don't apply, but we're not letting things through that should fire."*

Devraj noted: *"Phase 2 will sharpen the matching. For Phase 1, broadly alerting with clear 'keyword match only' labeling is the right posture."*

### §3.6 F-1.5-D Phase 1 Test Results (Cilla Oduya)

**Test plan:** 18 TCs

| TC | Description | Result |
|---|---|---|
| TC-F15D-001 | AD ingestion cron runs without error on FAA ADQS endpoint | ✅ PASS |
| TC-F15D-002 | New AD (not previously in adRecords) stored correctly | ✅ PASS |
| TC-F15D-003 | Amended AD updates existing adRecords entry (status: AMENDED) | ✅ PASS |
| TC-F15D-004 | AD for non-represented aircraft type generates no alert | ✅ PASS |
| TC-F15D-005 | AD for PT6A-42 type fires POSSIBLE_APPLICABLE for N521HPA | ✅ PASS |
| TC-F15D-006 | AD applicability text appears verbatim in notification | ✅ PASS |
| TC-F15D-007 | Marcus disclaimer text appears in every notification card | ✅ PASS |
| TC-F15D-008 | DOM in-app notification visible and actionable | ✅ PASS |
| TC-F15D-009 | CONFIRM APPLICABLE action adds AD to aircraft AD compliance board | ✅ PASS |
| TC-F15D-010 | DISMISS action stores dismissal with optional rationale | ✅ PASS |
| TC-F15D-011 | FLAG FOR REVIEW queues notification for compliance team | ✅ PASS |
| TC-F15D-012 | Double-confirm dialog on CONFIRM APPLICABLE (read AD before confirming) | ✅ PASS |
| TC-F15D-013 | Email digest includes new POSSIBLE_APPLICABLE alerts | ✅ PASS |
| TC-F15D-014 | Email digest respects DOM preference (daily/weekly/off) | ✅ PASS |
| TC-F15D-015 | Rate limiting: no more than 3 requests/sec to FAA ADQS | ✅ PASS |
| TC-F15D-016 | Ingestion failure (FAA endpoint down) handled gracefully; no data loss | ✅ PASS |
| TC-F15D-017 | Keyword matching true positive: PT6A-42 AD → flags B200 operator | ✅ PASS |
| TC-F15D-018 | Keyword matching true negative: helicopter-only AD → no alert for fixed-wing shops | ✅ PASS |

**18/18 PASS.**

Marcus's compliance clearance statement (2026-09-16):
> *"F-1.5-D Phase 1 reviewed. The AD ingestion pipeline, applicability matching algorithm, and alert distribution system are implemented as specified. The notification interface correctly displays the disclaimer language as agreed. The system makes no compliance determinations — it identifies potential matches for DOM review. The confirm/dismiss workflow with double-confirm for CONFIRM APPLICABLE appropriately gates legal applicability determination on the DOM. Phase 1 scope is compliant. — M. Webb, 2026-09-16"*

---

## §4. F-1.5-E — Cross-Shop Protocol Sharing: Foundation Architecture

### §4.1 The Origin of This Feature (FR-32-02)

In Phase 32, during Dale Renfrow's RMTS 30-day check-in, he asked a question that had no clean answer at the time:

*"When you set up High Desert MRO — or whoever the next turbine shop is — are you going to build the PT6A-114A borescope protocol from scratch again? Because we spent three hours on that protocol. I'd like to know it goes somewhere."*

Nadia had said: *"That's on the v1.5 list."*

It was. FR-32-02: cross-shop protocol sharing. The idea: a base protocol template — the regulatory-minimum floor for a given inspection type — that Marcus can define once, and that shops running the same engine type can adopt and customize. Dale's PROTO-RMTS-001 was the obvious seed. When Paul Kaminski's Walker Field Aviation Services comes on as the ninth shop (if Phase 34 qualification goes as expected), they'll be running the same Cessna 208B / PT6A-114A type. Dale's protocol should not be rebuilt from nothing.

Sprint 2 builds the foundation: the data model and the base template creation interface. Sprint 3 will build the shop adoption, template fork, and inheritance display.

### §4.2 Protocol Template Data Model (Devraj, 2026-08-25 through 2026-09-01)

Devraj extended the `maintenanceProtocol` schema in Convex:

```typescript
// Extended fields on maintenanceProtocol
isTemplate: v.optional(v.boolean()),
templateScope: v.optional(v.object({
  scope: v.union(
    v.literal("engine-type"),
    v.literal("airframe-type"),
    v.literal("inspection-type")
  ),
  typeReference: v.string(),  // e.g., "PT6A-114A" or "Cessna 208B" or "100hr-inspection"
})),
templateRequiredSteps: v.optional(v.array(v.id("protocolSteps"))),  
// Steps marked required cannot be removed by shop-level customization
// without DOM authorization + documented rationale
templateVersion: v.optional(v.string()),
templateCreatedBy: v.optional(v.id("users")),
templateApprovedBy: v.optional(v.id("users")),
```

A protocol record with `isTemplate: true` is visible in the Compliance Admin interface (Marcus-only) and in a read-only "Protocol Library" view for DOMs (Sprint 3 will add the adoption workflow; Sprint 2 ships the library view in read-only).

**`requiredSteps` floor mechanism:** Steps in a base template can be designated `required: true` (mandatory) or `required: false` (shop-customizable). When a shop creates a derived protocol from a template (Sprint 3 feature), required steps cannot be removed. The DOM must provide a documented rationale to override, which flags the override for Marcus's compliance team review. This is the regulatory-minimum floor concept.

Marcus's framing: *"The floor is the minimum the FAA expects. Shops can do more. They can add steps. They can add specificity. They cannot remove the regulatory minimum without documentation and review. The base template encodes what 'minimum' means."*

### §4.3 Base Template Creation UI (Marcus Admin Interface) (Chloe Park, 2026-09-01 through 2026-09-08)

The Compliance Admin interface (Marcus's domain in Athelon) gains a new section: **Protocol Library**. In Sprint 2, this section has two views:

1. **Template creation:** Marcus can mark any existing protocol as a template, assign a `templateScope`, designate steps as required or optional, and publish the template.
2. **Library list:** Displays all published templates with `templateScope`, version, and creation date.

Shop-level DOMs can view the Protocol Library in read-only mode (Sprint 3 adds the "Adopt this template" action).

Chloe designed the template creation flow to minimize friction for Marcus. The typical use case: Marcus is looking at PROTO-RMTS-001 (Dale Renfrow's PT6A-114A borescope protocol). He wants to promote it to a base template. He clicks "Promote to base template," designates the scope (engine-type: PT6A-114A), reviews the steps and marks the mandatory regulatory-minimum steps as `required: true`, adds a version number (v1.0), and publishes. Three minutes.

### §4.4 PT6A-114A Borescope Protocol — First Base Template (Marcus Webb, 2026-09-11)

On 2026-09-11, Marcus created the first base protocol template in Athelon. He promoted PROTO-RMTS-001 (PT6A-114A combustion liner borescope, filed Phase 30 by Dale Renfrow and Marcus during WO-RMTS-002 closure) to a base template.

**Template:** PT6A-114A Combustion Liner Borescope Inspection — Base Template v1.0
**Scope:** engine-type: PT6A-114A
**Created:** 2026-09-11
**Author:** Marcus Webb
**Based on:** PROTO-RMTS-001 (Rocky Mountain Turbine Service, Dale Renfrow)

Steps marked `required: true` (regulatory minimum, cannot be removed without DOM authorization):
1. Engine run to operating temperature before inspection (per P&WC EMM requirement)
2. Borescope port access per P&WC PT6A-114A EMM §72-00-00 (no deviations)
3. Documentation of all inspection findings per §43.9 (mandatory)
4. Combustion liner assessment per P&WC AIM/GO limits (dimensional limits mandatory)
5. Inspector certifying statement referencing approved data

Steps marked `required: false` (shop-customizable):
6. Pre-inspection engine cooling period (RMTS adds 45-minute cooling; other shops may differ)
7. Photo documentation of combustion liner findings (best practice; not FAA-required)
8. Post-inspection ground run verification (some shops add this; not in all EMM procedures)
9. Estimated time logging (RMTS adds this; HPAC may not need it)

**Marcus's note on first template creation:**
> *"I've been wanting to build this library since Dale asked about it in June. The protocol we built in Phase 30 was the right reference point. Every shop that runs a PT6A-114A is going to do combustion liner borescopes. They're going to do them the way they've always done them, or the way someone told them, or the way the last shop they worked at did it. The base template gives them a floor. The floor is what the EMM requires. The shop can do more than the floor. They cannot do less without telling us."*

**Dale Renfrow, notified of the template promotion on 2026-09-11:**
> *"Happy to have PROTO-RMTS-001 as the starting point. If Walker Field Aviation comes on-platform, tell them I'll answer questions."*

### §4.5 F-1.5-E Foundation Test Results (Cilla Oduya)

**Test plan:** 12 TCs (increased from planned 10 based on schema complexity)

| TC | Description | Result |
|---|---|---|
| TC-F15E-001 | `isTemplate` flag set on existing protocol → visible in admin Protocol Library | ✅ PASS |
| TC-F15E-002 | Template scope assigned correctly (engine-type: PT6A-114A) | ✅ PASS |
| TC-F15E-003 | `required: true` step designation persists and is read-only for shop users | ✅ PASS |
| TC-F15E-004 | `required: false` step visible and marked as customizable in library view | ✅ PASS |
| TC-F15E-005 | Marcus admin can promote existing protocol to template in <5 clicks | ✅ PASS |
| TC-F15E-006 | Protocol Library list view shows all published templates with scope/version | ✅ PASS |
| TC-F15E-007 | DOM (non-admin) can view Protocol Library in read-only mode | ✅ PASS |
| TC-F15E-008 | PT6A-114A base template integrity — all 9 steps present, 5 required | ✅ PASS |
| TC-F15E-009 | Schema migration clean across all 8 shop datasets (zero errors) | ✅ PASS |
| TC-F15E-010 | Non-template protocols unaffected by schema addition | ✅ PASS |
| TC-F15E-011 | Template version field stores and displays correctly | ✅ PASS |
| TC-F15E-012 | Template creation date and author stored and displayed | ✅ PASS |

**12/12 PASS.**

Marcus compliance note: *"F-1.5-E Foundation reviewed. The required/optional step designation implements the floor concept as intended. The admin-only promotion workflow is appropriate — base templates should require compliance team review before publication. Sprint 3 adoption workflow will need the same Marcus-review gate on any override of required steps. — M. Webb, 2026-09-17"*

---

## §5. Sprint 2 Integration and Release

### §5.1 Combined Test Suite (2026-09-15 through 2026-09-17)

Cilla ran the combined Sprint 2 test suite on 2026-09-15 through 2026-09-17:

**Sprint 2 new TCs:** 46 (16 F-1.5-C + 18 F-1.5-D + 12 F-1.5-E)
**v1.5.0-sprint1 regression:** 198 TCs
**Total:** 244 TCs

**Results:**
- Sprint 2 new TCs: **46/46 PASS** ✅
- Regression: **198/198 PASS** ✅
- **Total: 244/244 PASS** ✅

Zero regressions. Zero new defects in integration testing.

One pre-release concern from Cilla: the FAA ADQS integration adds an external API dependency. If the FAA endpoint is down during the daily cron, the ingestion fails silently without surfacing an error to the DOM. She flagged this as a monitoring gap and Devraj added an ingestion failure alert to the admin notification system (silently fails for DOM, surfaces in admin error queue). Not a release blocker; added as a day-1 monitoring note.

### §5.2 Marcus Compliance Final Sign-Off (2026-09-17)

Marcus Webb reviewed all three Sprint 2 features on 2026-09-17:

> *"v1.5 Sprint 2 compliance final review:*
>
> *F-1.5-C — Procurement Subfields: Reviewed. Structured procurement tracking supports §145.221 records requirements. FSDO Export with procurement subfield data improves audit posture for life-limited part replacements. Approved.*
>
> *F-1.5-D Phase 1 — Regulatory Change Tracking: Reviewed. The AD notification system operates as a possible-applicability alert layer, not a compliance determination. Disclaimer language is present and correct. DOM confirm/dismiss workflow with double-confirm gate appropriately assigns determination to the DOM. Phase 1 scope is compliant with intent. The 'FLAG FOR REVIEW' option routing to compliance team is appreciated. Approved.*
>
> *F-1.5-E Foundation — Protocol Sharing: Reviewed. Required/optional step designation implements the regulatory floor concept. Admin-only template promotion workflow is appropriate. Sprint 3 adoption workflow will require the same compliance review gate on required step overrides. Approved.*
>
> *All three features: ✅ APPROVED for release. — M. Webb, Compliance Lead, 2026-09-17"*

### §5.3 Jonas Release Gate (2026-09-18)

Jonas Harker ran the pre-release checklist on 2026-09-18:

| Gate item | Status |
|---|---|
| All Sprint 2 TCs PASS (46/46) | ✅ |
| Regression TCs PASS (198/198) | ✅ |
| Marcus compliance clearance all three features | ✅ |
| Cilla QA sign-off | ✅ |
| UAT from named DOM contacts (Curtis ✅, Lorena ✅) | ✅ |
| Database schema migration verified (dry run: 8 shop environments, 0 errors) | ✅ |
| Rollback plan ready | ✅ |
| FAA ADQS API credentials active and validated | ✅ |
| External API integration monitoring (Devraj admin alert) | ✅ |
| Release notes written | ✅ |

Jonas: **Release gate CLEAR. v1.5.0-sprint2 authorized to ship.**

### §5.4 Deployment (2026-09-19)

v1.5.0-sprint2 deployed to all 8 shops in two waves on 2026-09-19:
- **Wave 1 (07:00 UTC):** Ridgeline Air Maintenance (KRTS), Rocky Mountain Turbine Service (KGJT), High Desert MRO (KPRC), Desert Sky Turbine (KSDL)
- **Wave 2 (10:00 UTC):** Lone Star Rotorcraft (KFTW), Priya Sharma SPEA Air (KRAL), Ridgeline Air Maintenance backup tenant, High Plains Aero & Charter (KPUB)

**Post-deployment monitoring (Jonas, 24-hour window):**
- Zero error spikes in any shop environment
- FAA ADQS ingestion cron fired successfully at 06:00 UTC on 2026-09-20 — 847 ADs processed, 0 new POSSIBLE_APPLICABLE alerts for the period (no new ADs for represented fleet types in the 24-hour window)
- All 8 shops confirmed on v1.5.0-sprint2 by end of 2026-09-19

**First field observation of the day:**
Curtis Pallant sent a message to Devraj at 11:47 UTC on 2026-09-19: *"The WO subfields are showing up on WO-RDG-003. Looks good. Also I see something called 'Regulatory Alerts' in my nav. Is that the AD thing?"*

Devraj: *"Yes. Check it — it might already have something for you."*

Curtis logged in, found one POSSIBLE_APPLICABLE alert for N4421T: an AD for PT6A-66 series engines related to a compressor stator inspection — issued 90 days prior (captured in the Phase 1 retroactive validation run). He read the full AD text. His note in Athelon: *"Reviewed AD [AD number]. Effectivity: PT6A-66, -66B, -66D, -67. My engine is -66D. S/N PCE-RB0449 is in effectivity. CONFIRM APPLICABLE."*

He pressed CONFIRM APPLICABLE. The AD was added to N4421T's AD compliance board, status: ACTION_REQUIRED.

He called Marcus thirty seconds later.

Marcus: *"Yes, I saw the notification. I was going to call you. Do you have the logbook entry for the previous compliance?"*

Curtis: *"Looking now."*

This was the first live use of the Regulatory Change Tracking alert. It found a real thing. The DOM reviewed and confirmed it, on the same day the feature shipped.

---

## §6. Sprint 2 Summary

**v1.5.0-sprint2 — Features shipped:**

| Feature | Status | TCs |
|---|---|---|
| F-1.5-C Procurement Workflow Status Subfields | ✅ SHIPPED | 16/16 |
| F-1.5-D Regulatory Change Tracking Phase 1 | ✅ SHIPPED | 18/18 |
| F-1.5-E Cross-Shop Protocol Sharing Foundation | ✅ SHIPPED | 12/12 |
| FR-33-02 FSDO Export date range polish | ✅ SHIPPED | (bundled with F-1.5-C) |
| FR-33-03 Mobile drag handle sizing | ✅ SHIPPED | (bundled with F-1.5-C) |

**Sprint 2 totals:** 46 new TCs + 198 regression = 244/244 PASS.

**Feature requests logged for Sprint 3:**
- FR-34-01 (Lorena): Core deposit tracking subfield on Procurement WO
- FR-34-02 (Cilla/Curtis): Show matched keywords in AD alert notification
- FR-34-03 (Marcus): Sprint 3 — F-1.5-D Phase 2 (SB/revision tracking + full DOM confirmation workflow)
- FR-34-04 (Marcus): Sprint 3 — F-1.5-E shop adoption/template fork workflow

---

*WS34-C complete. v1.5.0-sprint2 shipped 2026-09-19. 244/244 TCs PASS. Marcus compliance ✅. Cilla QA ✅. Jonas release gate ✅. All 8 shops deployed.*
