# Phase 33 — v1.5 Sprint 1 + 8th Shop + King Air ALS Expansion
**Version arc:** v1.5
**Phase dates:** 2026-07-16 through 2026-08-18
**Status:** PLANNING
**Program Director:** Nadia Solis
**Phase theme:** From depth to breadth — the v1.4 arc made one thing deeply right; v1.5 makes the platform accessible to more shops without losing that depth.

---

## §1. Phase Mission

Phase 32 closed the v1.4 arc. Six features, seven shops, 148 integration test cases, zero production incidents. The ALS compliance lifecycle is now platform-native. That was the depth work.

Phase 33 opens the v1.5 arc with a different question: can Athelon expand to a meaningfully different shop — new aircraft type, new regulatory profile, new geography — without losing the compliance integrity that seven shops and four versions have earned?

The proof case is Lorena Vásquez and High Plains Aero & Charter. Two King Air B200s. A dual-cert Part 145/Part 135 operation in Pueblo, Colorado. An aircraft type Athelon has never served. An engine (PT6A-42) with a more complex ALS table than any turbine we've audited. A DOM who came inbound because someone in the Grand Junction aviation community mentioned that "a compliance system" had changed the way they work.

Phase 33 runs four parallel tracks:

**WS33-A** — Pre-onboarding qualification for Lorena Vásquez / High Plains Aero & Charter. Nadia leads the discovery call and relationship. Marcus names compliance gaps upfront. The 8th shop is not a surprise — if there's a gap, it surfaces in the qualification phase, not on Day 1.

**WS33-B** — v1.5 Sprint 1: two first features from the v1.5 backlog. FSDO Audit Export Improvements (ranked #2, MEDIUM effort) and Mobile Ramp-View Quick ALS Card (ranked #5, MEDIUM effort). These are the right sprint-1 candidates: meaningful compliance value, scoped, testable, and do not block each other or the ALS expansion work.

**WS33-C** — King Air B200 / PT6A-42 ALS expansion. New aircraft type entry into Athelon: Beechcraft King Air B200. Two engines (PT6A-42), 14 LLP items, 6 CMR items per engine. Marcus audits the PT6A-42 ICA and TCDS; builds the seed ALS table; Tobias Ferreira or Lorena's IA field-validates; Devraj implements; Cilla tests. This is the same protocol used for every prior ALS expansion — it is now proven and named.

**WS33-D** — Miles Beaumont's fifteenth dispatch. Theme: v1.5 as the turn from depth to breadth, and the 8th shop as the proof case.

---

## §2. The 8th Shop — Lorena Vásquez, High Plains Aero & Charter

### §2.1 Shop Profile

**Shop name:** High Plains Aero & Charter
**Location:** Pueblo Memorial Airport (KPUB), Pueblo, Colorado 81001
**Physical address:** 1780 Airport Road, Suite 4, KPUB, Pueblo CO 81001
**Certificate(s):** Part 145 (HPAC-145-0044); Part 135 (HPAC-135-CO-0044)
**DOM / IA:** Lorena Vásquez, IA-CO-7745
**Co-owner / Accountable Manager:** Derek Sousa
**Personnel:** 9 certificated (Lorena + Derek + 7 mechanics/inspectors)
**Inbound source:** Website contact form, 2026-06-12 (warm referral from Dale Renfrow / RMTS orbit via Hector Ruiz, who grew up in Pueblo)

### §2.2 Lorena Vásquez — Character Profile

Lorena Vásquez is 41, born and raised in Pueblo, Colorado. Her father was a crop duster mechanic who taught her to safety-wire before she could drive. She got her A&P certificate at age 20 from a community college program in Colorado Springs, spent three years at a Cessna factory maintenance center in Wichita learning turbine systems, and came back to Pueblo at 28 to build something of her own.

High Plains Aero started as a Part 91 piston shop — Lorena doing 100-hour inspections and annuals out of a single rented bay at KPUB. Derek Sousa (her partner and co-owner, whom she met at a PAMA regional meeting in 2014) handled the business side; Lorena handled the wrenches. By 2019 they had four mechanics, a Part 145 certificate, and a contract with a local flight school. In 2021 they added the Part 135 certificate and two Beechcraft King Air B200s to the charter fleet — a regional air taxi play that has grown steadily as the Colorado oil-and-gas corridor generates corporate charter demand between Pueblo, Grand Junction, and Denver.

Lorena holds an IA, a type-specific signatory authorization for the Beechcraft King Air B200 under her Part 145, and a reputation in the Colorado aviation community for doing the compliance work right. She is known at the local FSDO (Denver Flight Standards District Office, with jurisdiction over KPUB) as "the Pueblo shop that never gets surprised by an audit." She is meticulous, direct, and skeptical of software products that promise simplicity in compliance contexts. She signed the Athelon contact form with the note: *"Interested in turbine ALS tracking. Not interested in another platform that doesn't understand what a CMR is."*

Marcus Webb read that note before the discovery call. He wrote three words in his notebook: *"She's done the reading."*

### §2.3 Fleet Under Management

| Tail | Type | Engine | Role | ALS Priority |
|---|---|---|---|---|
| N521HPA | Beechcraft King Air B200 | 2x P&WC PT6A-42 | Part 135 charter (primary) | HIGH — 14 LLP + 6 CMR items per engine |
| N408HPA | Beechcraft King Air B200 | 2x P&WC PT6A-42 | Part 135 charter (secondary) | HIGH — same ALS profile |
| N3382P | Cessna 421 Golden Eagle | 2x Continental GTSIO-520-L | Part 135 charter | MEDIUM — piston twin; ALS limited |
| N18116 | Cessna 172S | Lycoming IO-360-L2A | Flight training contract | LOW — Part 91, minimal ALS |
| N52284 | Cessna 182T | Lycoming IO-540-AB1A5 | Flight training contract | LOW — Part 91 |
| N8014R | Piper Navajo Chieftain | 2x Lycoming TIO-540-A2C | Part 135 cargo charter | MEDIUM — piston twin |
**Total: 6 aircraft under management** (7 counting second 172S on order for flight school)

**Compliance-critical assets:** N521HPA and N408HPA — each carries two PT6A-42 engines with 40 ALS items per aircraft (14 LLP + 6 CMR × 2 engines). These are the primary onboarding driver.

### §2.4 New Geography

Pueblo, Colorado (KPUB) is not currently represented among Athelon's seven shops. It is distinct from:
- Columbus OH — 1,200 miles east
- Prescott AZ — 500 miles southwest
- Scottsdale AZ — 480 miles south
- Fort Worth TX — 800 miles southeast
- Grand Junction CO — 170 miles northwest (same state, different air basin and regulatory district)
- Reno NV — 880 miles west
- Phoenix area AZ — 520 miles south

KPUB is served by the Denver FSDO (also covers RMTS at KGJT), which means Marcus already has a working relationship with the regulatory district. This is an advantage for compliance gap assessment.

### §2.5 New Regulatory Profile

High Plains Aero is the first prospect with a dual-cert Part 145 + Part 135 operation at a meaningful scale. Priya Sharma's SPEA Air is Part 135 with Part 91 maintenance — a simpler profile. Lorena's operation has:
- A Part 145 repair station performing maintenance on third-party aircraft
- A Part 135 certificate governing the charter fleet with full ops spec implications
- An IA (Lorena herself) who performs both maintenance and charter operation oversight

This means Phase 33 onboarding will surface Part 135 gaps that Priya's smaller operation did not fully stress-test. The WS32-E scoping session identified Part 135 Deeper Integration as a v1.5 priority. The Priya discovery call (due 2026-07-15) should happen before the Lorena qualification call — insights from Priya will sharpen Marcus's gap list.

---

## §3. Workstream Plans

### §3.1 WS33-A — 8th Shop Pre-Onboarding Qualification (Lorena Vásquez / HPAC)

**Owner:** Nadia Solis (lead), Marcus Webb (compliance gap assessment)
**Timeline:** 2026-07-16 through 2026-07-30 (qualification decision by 2026-07-30)
**Status:** PLANNED

**Scope:**
1. **Nadia discovery call** (2026-07-16, target): 45–60 minutes. Lorena has self-identified her pain point (turbine ALS tracking); the call is about understanding the full operational picture before Athelon proposes a solution. Nadia will cover: current tracking method for King Air B200 ALS items; current FSDO audit posture (how do they demonstrate compliance today?); PT6A-42 log card workflow; Part 135 ops spec compliance workflow; relationship with the Denver FSDO; timeline and urgency. Nadia will NOT make a software demonstration or pitch on this call.

2. **Marcus compliance gap pre-assessment** (concurrent with discovery call prep, 2026-07-16): Before Lorena's call, Marcus will review Athelon's current Part 135/Part 145 dual-cert support surface and produce a gap list — what does Athelon do today that addresses Lorena's profile, and what does it not do? This is the same upfront gap naming that Marcus performed before Rocky Mountain Turbine Service's onboarding in WS29-A. The DOM should never discover a limitation on Day 1 that the team already knew existed.

3. **Qualification assessment** (2026-07-18, target): After the discovery call, Nadia + Marcus + Devraj assess whether Lorena's profile is a good Phase 33 candidate given what they learned on the call. Decision factors: Does Lorena's urgency match Phase 33 timing? Are the compliance gaps identified in Marcus's pre-assessment addressable before onboarding begins? Is the PT6A-42 ALS audit (WS33-C) achievable in Phase 33 scope? Is Derek Sousa's involvement (accountable manager) compatible with the DOM-primary onboarding model?

4. **Qualification outcome** (2026-07-20 target): One of three results:
   - **QUALIFIED — proceed to Phase 33 onboarding scope:** Lorena's profile is a fit; proceed to full onboarding planning; WS33-C PT6A-42 ALS expansion is the technical prerequisite.
   - **QUALIFIED WITH CONDITIONS:** Lorena's profile is a fit but one or more conditions must be resolved first (e.g., Part 135 surface gap requires targeted v1.5 sprint work before onboarding is useful for her).
   - **DEFER TO PHASE 34:** Lorena's profile or timing is not a fit for Phase 33; hold relationship, schedule for Phase 34.

5. **If QUALIFIED: pre-onboarding gap brief to Lorena** (2026-07-22 target): Marcus and Nadia present Lorena with an honest written summary of what Athelon does and does not do for her specific profile, before she signs anything. "Here is what we have. Here is what we're building. Here is the timeline. Here is the gap." This has been Athelon's standard practice since Phase 29 / Dale Renfrow's onboarding; it is the non-negotiable step that preserves trust.

**Key inputs:**
- WS32-D pipeline assessment (P-32-02 profile)
- WS32-E v1.5 scoping (Part 135 Deeper Integration backlog item)
- Priya Sharma discovery call results (Nadia, due 2026-07-15, pre-Phase 33)
- Marcus's pre-assessment of Athelon's dual-cert Part 145/135 support surface

**Key outputs:**
- Qualification decision document (QUALIFIED / QUALIFIED WITH CONDITIONS / DEFER)
- Marcus's compliance gap memo for Lorena's profile
- If QUALIFIED: pre-onboarding brief delivered to Lorena
- If QUALIFIED: Phase 33 onboarding scope document (deliverable: Phase 33 or Phase 34 follow-on)

**Artifact path:** `phase-33-v15/ws33-a-hpac-qualification.md`

---

### §3.2 WS33-B — v1.5 Sprint 1 (FSDO Audit Export Improvements + Mobile Ramp-View Quick ALS Card)

**Owner:** Devraj Anand (engineering lead), Cilla Oduya (QA), Marcus Webb (compliance review), Chloe + Finn (UI)
**Timeline:** 2026-07-21 through 2026-08-11 (Sprint 1 build + test window)
**Status:** PLANNED

#### §3.2.1 Feature B-1: FSDO Audit Export Improvements

**Feature ID:** F-1.5-A
**Reference:** WS32-E Candidate B; Ranked #2 in v1.5 backlog
**Compliance impact:** HIGH
**Effort:** MEDIUM

**What the current export covers:**
- Maintenance records (work orders, sign-offs, RTS entries)
- ALS board snapshot (current state of all ALS items per aircraft)
- Repetitive AD compliance status

**What the current export does NOT cover:**
- Certificated personnel records (IA certs, A&P certs, repairman certs)
- Repair station certificate number (F-1.4-D added this to maintenance releases but not to the FSDO export bundle)
- Procedures manual reference (most shops keep this in a binder; the export provides no pointer)
- Open discrepancy list (current work orders in OPEN status)

**What this feature builds:**
1. **Personnel cert bundle in FSDO export:** The FSDO export will include a section for certificated personnel attached to the shop. For each personnel record, the export includes: name, certificate type (A&P / IA / repairman), certificate number, expiration date (where applicable), and the certificate document file if uploaded in Athelon. This requires no new data collection — personnel profiles and cert documents already exist in the system; they are not included in the export template.

2. **Open discrepancy list in FSDO export:** A section listing all work orders currently in OPEN or PENDING-CLOSE status, with aircraft tail, work type, open date, and assigned mechanic. This gives the FSDO inspector a single view of the shop's current maintenance workload.

3. **Procedures manual link / reference field:** A new org-level text field: `repairStation.proceduresManualLocation` (required: type — `document_link` | `file_path_external` | `binder_location_note`; free text for the location note). This field populates in the FSDO export as: *"Procedures Manual: [location note]."* A shop that stores their PM in Athelon documents can link it; a shop that keeps it in a binder can note the physical location. The FSDO inspector gets a pointer, not a gap.

4. **Export bundle cover page:** A structured cover page for the FSDO export PDF that includes: shop name, Part 145 cert number, DOM name and IA certificate, export date, aircraft count, and a checklist of sections included. The FSDO inspector should be able to determine within 30 seconds what is in the export package.

**Test requirements (Cilla):**
- TC matrix: minimum 20 TCs covering: personnel cert section with varying cert types, open discrepancy list with mixed WO states, procedures manual link variations, cover page generation, export PDF structure
- Regression: existing FSDO export functionality (maintenance records, ALS snapshot) unchanged
- Compliance review (Marcus): personnel cert section format reviewed for FSDO inspector usability; open discrepancy list reviewed for completeness against 14 CFR §145.217

**UAT targets:** Frank Nguyen (DST — has prior FSDO audit experience from WS27-C); Marcus Webb as compliance reviewer.

#### §3.2.2 Feature B-2: Mobile Ramp-View Quick ALS Card

**Feature ID:** F-1.5-B
**Reference:** WS32-E Candidate F; Ranked #5 in v1.5 backlog; FR-32-03 (Dale Renfrow)
**Compliance impact:** MEDIUM
**Effort:** MEDIUM

**What the problem is:**
The ALS board is accessible from the aircraft detail view: 3+ taps from the app home screen. For a DOM doing a pre-departure check on the ramp, this is functionally inaccessible in real time. Dale Renfrow specifically noted that by the time he navigates to the ALS board, the pilot is already impatient. The data exists; the access path is wrong for ramp use.

**What this feature builds:**
1. **Pinned aircraft shortcut cards on mobile home screen:** The DOM mobile home screen gains a configurable "Quick Access" section — up to 5 pinned aircraft cards, each showing: tail number, aircraft type, and the top ALS status line. The pin order is configurable; the DOM drags to reorder.

2. **ALS status line logic:**
   - If any OVERDUE items exist: "⛔ OVERDUE — [N] items" (red)
   - If any DUE_SOON items exist and no OVERDUE: "⚠️ DUE_SOON — [N] items in ≤30 days" (amber)
   - If all COMPLIANT: "✅ All clear — next due: [item name] in [X] days" (green)
   - The status line reflects the single most urgent condition. Tapping the card opens the full ALS board for that aircraft.

3. **Quick card widget (iOS + Android):** A home screen widget variant (iOS WidgetKit; Android App Widget) that can be placed on the device home screen, displaying the same status card without opening the app. Real-time data sync when the app is in the background (respects battery optimization guidelines on both platforms).

4. **Ramp quick-check UX:** On the full ALS board, a new "Ramp View" mode — a simplified single-page layout with large text and high contrast, optimized for bright sunlight. Toggle in the top-right corner of the ALS board. This is a view-only mode; no editing from Ramp View.

**Test requirements (Cilla):**
- TC matrix: minimum 22 TCs covering: pin/unpin behavior, status line logic for all three states, widget data sync (online + offline), Ramp View toggle behavior, iOS and Android platform matrix
- Regression: existing ALS board functionality unchanged; existing home screen unchanged for non-mobile viewports
- Platform testing: Cilla to test on iOS 17+ (iPhone 14 and newer) and Android 13+ (Samsung Galaxy Tab A8 and Pixel 6)

**UAT targets:** Dale Renfrow (RMTS — the requester); Curtis Pallant (Ridgeline — turbine shop DOM with ramp-facing use case).

#### §3.2.3 Sprint 1 Sequencing

Both features are independent and can be built in parallel:

| Week | F-1.5-A (FSDO Export) | F-1.5-B (Mobile Ramp-View) |
|---|---|---|
| Week 1 (2026-07-21) | Data model: `repairStation.proceduresManualLocation` field; export template architecture; personnel cert section schema | Mobile home screen pin architecture; ALS status line logic; card component design |
| Week 2 (2026-07-28) | Export PDF generation: cover page + personnel section + open discrepancy list; Marcus compliance review of export format | Home screen widget (iOS + Android); Ramp View mode (ALS board toggle); offline sync behavior |
| Week 3 (2026-08-04) | UAT with Frank Nguyen; regression suite; Cilla final TC matrix | iOS + Android platform test matrix; UAT with Dale Renfrow; Cilla final TC matrix |
| Week 4 (2026-08-11) | Integration; Jonas release gate sign-off; ship | Integration; Jonas release gate sign-off; ship |

**Artifact path:** `phase-33-v15/ws33-b-v15-sprint1.md`

---

### §3.3 WS33-C — King Air B200 / PT6A-42 ALS Expansion

**Owner:** Marcus Webb (audit lead), Lorena Vásquez's IA or Tobias Ferreira (field validation), Devraj Anand (implementation), Cilla Oduya (test)
**Timeline:** 2026-07-21 through 2026-08-08 (audit + seed data build; implementation follows qualification of WS33-A)
**Status:** PLANNED

**Context:** The King Air B200 is powered by two Pratt & Whitney Canada PT6A-42 engines. The PT6A-42 ALS table (P&WC Engine Maintenance Manual PWEC Document 3002174) contains 14 LLP items and 6 CMR items per engine. Each King Air B200 at High Plains Aero (N521HPA, N408HPA) carries two engines, producing 40 ALS items per aircraft and 80 ALS items for the two-aircraft fleet. This is the most ALS-dense aircraft type Athelon has audited.

In addition to the engine ALS items, the King Air B200 airframe has Airworthiness Limitations Section (ALS) items per the Beechcraft King Air B200 Maintenance Manual (Raytheon Aircraft Publication 101-590012-19, §05-10). These include structural fatigue life items, actuator cycle limits, and landing gear life limits.

**Established ALS audit protocol (from prior phases):**
The formal ALS audit protocol was established through WS26-A (Robinson R44), WS27-A (Bell 206B-III), WS27-B (Sikorsky S-76C), WS30-A (Cessna 208B), and WS32-B (PT6A-66D). The Phase 33 King Air B200 audit follows the same protocol:

1. **Source document research** (Marcus): Obtain and review TCDS (Type Certificate Data Sheet) for Beechcraft King Air B200 (TCDS #A24CE); obtain PT6A-42 Engine TCDS (TCDS #E1WE); review the King Air B200 ICA and Airworthiness Limitations Section; review P&WC PT6A-42 EMM §05-10 for LLP and CMR items.

2. **ALS table build — airframe** (Marcus): Identify all Beechcraft King Air B200 airframe ALS items from the Maintenance Manual §05-10 and ICA. Build seed data table: component, part number, life limit (cycles or calendar), limit basis (regulatory/manufacturer), and any applicable service bulletin applicability.

3. **ALS table build — engine** (Marcus): Extract all 14 LLP items and 6 CMR items per PT6A-42 engine from P&WC PWEC Document 3002174 §05-10. Cross-reference against the FAA-approved TCDS. Build seed data table per engine (2 engines per aircraft; seed data applies to both).

4. **Seed data assembly** (Devraj): Convert Marcus's audit tables into Athelon `alsItems` schema format. Create the King Air B200 + PT6A-42 template in the Turbine-Type ALS Template Library (extending F-1.4-C). Template to be reusable for any future King Air B200 operator.

5. **Field validation** (IA — Lorena Vásquez or Tobias Ferreira): The seed data is reviewed against a real aircraft's logs. Lorena Vásquez, as the IA for N521HPA and N408HPA, is the natural field validator — she will review the ALS seed table against N521HPA's actual logbooks and maintenance records, confirming that each item's life limit matches the aircraft-specific documentation. If Lorena's qualification (WS33-A) is not yet complete, Tobias Ferreira can perform preliminary field validation as an independent IA; Lorena confirms on her own aircraft at onboarding.

6. **Implementation** (Devraj): King Air B200 and PT6A-42 templates added to the ALS template library. System tested with synthetic N521HPA and N408HPA data (Devraj builds synthetic aircraft records at realistic accumulated cycle counts).

7. **QA testing** (Cilla): TC matrix covering: template accuracy (all 14 LLP + 6 CMR items per engine present and correct), life limit calculation for both engines independently, multi-engine aircraft ALS board display (showing per-engine items), template reuse for a second aircraft (N408HPA), integration with F-1.4-B compliance dashboard (40-item board per aircraft).

**Target audit outcomes:**
- King Air B200 airframe ALS template complete (estimated 8–12 items)
- PT6A-42 LLP template complete (14 items per engine)
- PT6A-42 CMR template complete (6 items per engine)
- Total ALS items per aircraft (both engines): 40 (engine) + ~10 (airframe) = ~50 items
- Template ready for activation at Lorena's first data entry session

**Source documents for Marcus's audit:**
- FAA TCDS #A24CE (Beechcraft King Air B200)
- FAA TCDS #E1WE (Pratt & Whitney Canada PT6A-42 series)
- Raytheon/Beechcraft King Air B200 Maintenance Manual Pub. 101-590012-19, §05-10
- P&WC PT6A-42 Engine Maintenance Manual PWEC Document 3002174, §05-10
- P&WC PT6A-42 Engine ICA (Installation, Continuation of Airworthiness)
- Applicable Beechcraft Service Bulletins affecting ALS items

**Artifact path:** `phase-33-v15/ws33-c-king-air-als-expansion.md`

---

### §3.4 WS33-D — Miles Beaumont, Fifteenth Dispatch

**Owner:** Miles Beaumont
**Filing target:** 2026-08-15 (end-of-phase)
**Status:** PLANNED

**Theme: v1.5 as the turn from depth to breadth**

The v1.4 arc was a depth play. Six features, all organized around a single question: can an MRO software platform own the ALS compliance lifecycle end-to-end? The answer, across four phases and seven shops, turned out to be yes — but only if the platform is willing to do the hard work of knowing the aircraft, knowing the regulation, and knowing what a real mechanic needs to see when they're standing on the ramp at 7 a.m.

v1.5 is a different kind of question. The depth work succeeded. Now: can it scale to a shop that doesn't look like the first seven? The 8th shop is the proof case. Not another Arizona piston shop. Not another C208B Caravan operator. A King Air. A charter operation. Lorena Vásquez, who described herself in a contact form as *not interested in another platform that doesn't understand what a CMR is.*

The fifteenth dispatch lives in the space between those two questions. What does it mean to earn the trust of a shop that came in skeptical? What does it mean to build a King Air ALS table for the first time — 40 items per aircraft, two aircraft, and a DOM who knows the source documents better than most consultants? What does Phase 33 say about what Athelon is becoming, and what does that mean for the mechanics, the DOMs, the compliance team that built it?

**Candidate scenes for the dispatch:**
- Marcus building the PT6A-42 ALS table alone — the research phase, the source documents, the moment the count exceeds anything they've built before
- Lorena's discovery call — the moment when Nadia realizes this DOM has already done the compliance research; the "she's done the reading" scene that Marcus wrote in his notebook
- The ramp at KPUB in summer — the Cessna 421 parked next to the King Air, the contrast between a piston twin and a turboprop charter operation, the compliance distance between them
- The sprint — Devraj building the mobile ramp-view widget and thinking about Dale Renfrow standing on the ramp at KGJT at 6:45 a.m. on a fire suppression dispatch day; the feature is for him but it's built in Denver
- The dispatch closes with the 8th shop question not yet answered — Phase 33 ends with qualification, not full onboarding. The proof isn't complete yet. That's honest.

**Artifact path:** `phase-33-v15/dispatches/dispatch-33.md`

---

## §4. Phase 33 Workstream Table

| Workstream | Status | Artifact Path | Owner(s) |
|---|---|---|---|
| Phase 32 Gate Review | ✅ DONE — GO | reviews/phase-32-gate-review.md | Review Board |
| WS33 Plan | ✅ DONE | phase-33-v15/ws33-plan.md | Nadia + Marcus + Devraj + Cilla + Jonas |
| WS33-A HPAC Pre-Onboarding Qualification (Lorena Vásquez, 8th Shop) | ⬜ PLANNED | phase-33-v15/ws33-a-hpac-qualification.md | Nadia + Marcus |
| WS33-B v1.5 Sprint 1 (F-1.5-A FSDO Export + F-1.5-B Mobile Ramp-View) | ⬜ PLANNED | phase-33-v15/ws33-b-v15-sprint1.md | Devraj + Cilla + Marcus + Chloe + Finn |
| WS33-C King Air B200 / PT6A-42 ALS Expansion | ⬜ PLANNED | phase-33-v15/ws33-c-king-air-als-expansion.md | Marcus + Lorena Vásquez (field validation) + Devraj + Cilla |
| WS33-D Miles Beaumont — Fifteenth Dispatch | ⬜ PLANNED | phase-33-v15/dispatches/dispatch-33.md | Miles Beaumont |

---

## §5. Phase 33 Timeline

| Week | Dates | WS33-A | WS33-B | WS33-C | WS33-D |
|---|---|---|---|---|---|
| Week 1 | 2026-07-16 to 07-22 | Discovery call (Lorena) + Marcus gap pre-assessment | Sprint 1 architecture + design sprint | Marcus source document research (TCDS, ICA, EMM) | Scene research; KPUB observation (if Lorena agrees) |
| Week 2 | 2026-07-23 to 07-29 | Qualification assessment + decision document | Sprint 1 build (both features in parallel) | Marcus ALS table build (airframe + engine) | Draft outline |
| Week 3 | 2026-07-30 to 08-05 | Pre-onboarding gap brief to Lorena (if QUALIFIED) | Sprint 1 UAT + regression | Field validation (Lorena or Tobias); Devraj seed data entry | First draft |
| Week 4 | 2026-08-06 to 08-12 | Onboarding scope document (if QUALIFIED) | Sprint 1 Cilla TC matrix + Jonas release gate | Devraj implementation + Cilla QA testing | Revision |
| Week 5 | 2026-08-13 to 08-18 | Phase 33 gate review prep | Phase 33 gate review prep | Phase 33 gate review prep | Dispatch filing (2026-08-15) |

---

## §6. Phase 33 Exit Criteria

- **WS33-A:** Qualification decision document filed (QUALIFIED / QUALIFIED WITH CONDITIONS / DEFER). If QUALIFIED: pre-onboarding gap brief delivered to Lorena Vásquez. Onboarding scope document filed.
- **WS33-B:** F-1.5-A (FSDO Export Improvements) and F-1.5-B (Mobile Ramp-View) both shipped. Cilla sign-off ✅. Marcus compliance clearance ✅. Jonas release gate ✅. UAT from named DOM contacts ✅.
- **WS33-C:** King Air B200 + PT6A-42 ALS template complete. Marcus audit tables filed. Field validation complete. Devraj implementation complete. Cilla QA sign-off ✅. Template ready for activation.
- **WS33-D:** Fifteenth dispatch filed.
- **Phase 33 gate review:** Filed and GO verdict recorded.

---

## §7. Dependency Notes

- **WS33-A depends on:** WS32-E (v1.5 scoping output — Part 135 gap awareness); Priya Sharma discovery call (Nadia, target 2026-07-15 — insights inform Lorena's gap assessment); WS32-D (Lorena's prospect profile).
- **WS33-B depends on:** WS32-E (feature specifications); WS32-A (v1.4.0 is the baseline). No dependency on WS33-A or WS33-C.
- **WS33-C depends on:** WS33-A qualification outcome (field validator identity; if HPAC qualification fails, Tobias Ferreira serves as independent field validator and the template is built speculatively for Phase 34 activation). Can begin Marcus audit work in parallel with WS33-A qualification.
- **WS33-D depends on:** Phase 33 activities providing scene material. Draft can begin from scene outlines in Week 3; dispatch filed after WS33-A and WS33-C outcomes are known.

---

## §8. Characters Active in Phase 33

**Returning:**
- Nadia Solis — Program Director, leads WS33-A qualification relationship
- Marcus Webb — Compliance; leads WS33-C audit; gap assessment for WS33-A
- Devraj Anand — Engineering Lead; WS33-B build lead; WS33-C implementation
- Cilla Oduya — QA Lead; WS33-B TC matrix; WS33-C QA testing
- Jonas Harker — Release/Infrastructure; WS33-B release gate
- Chloe Park + Finn Calloway — UI; WS33-B mobile widget and Ramp View
- Tobias Ferreira — IA, field validation for WS33-C if Lorena is not yet onboarded
- Dale Renfrow — UAT for WS33-B F-1.5-B (Mobile Ramp-View — his feature request)
- Frank Nguyen — UAT for WS33-B F-1.5-A (FSDO Export — his compliance domain)
- Curtis Pallant — UAT for WS33-B F-1.5-B (turbine shop DOM use case)
- Miles Beaumont — Fifteenth dispatch

**New characters:**
- **Lorena Vásquez** — DOM/IA, High Plains Aero & Charter, KPUB Pueblo CO. Leads WS33-A from the shop side; field validator for WS33-C if qualified. Character profile: §2.2 above.
- **Derek Sousa** — Co-owner and accountable manager, High Plains Aero & Charter. Will be present at pre-onboarding qualification call; handles business side of the scope discussion.

---

## §9. v1.5 Backlog Status (Phase 33 Entry)

| Rank | Feature | Phase 33 Action | Status |
|---|---|---|---|
| 1 | Regulatory Change Tracking | NOT in Phase 33 sprint — Devraj FAD AD API spike underway | Backlog (Sprint 2–3) |
| 2 | FSDO Audit Export Improvements (F-1.5-A) | **WS33-B Sprint 1** | ⬜ PLANNED |
| 3 | Cross-Shop Protocol Sharing | NOT in Phase 33 sprint | Backlog (Sprint 2–3) |
| 4 | Part 135 Deeper Integration | NOT in Phase 33 sprint (post-discovery) | Backlog (Sprint 3+) |
| 5 | Mobile Ramp-View Quick ALS Card (F-1.5-B) | **WS33-B Sprint 1** | ⬜ PLANNED |
| 6 | Seasonality Utilization Modeling | v1.4.x hotfix track — Devraj + Jonas executing | Hotfix track |
| 7 | Multi-Shop Analytics | Architecture investment; not in Phase 33 | Longer horizon |

---

*WS33 Plan complete. Phase 33 authorized by Phase 32 gate review (GO UNCONDITIONAL, 2026-07-15). Phase 33 open: 2026-07-16. Phase theme: from depth to breadth. Proof case: Lorena Vásquez, High Plains Aero & Charter, Pueblo CO, King Air B200.*
