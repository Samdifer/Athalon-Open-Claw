# Phase 35 — Walker Field Onboarding + OI-33-01 PTH Installation + OI-33-02 Stator Receipt + v1.5 Sprint 3
**Version arc:** v1.5
**Phase dates:** 2026-09-26 through 2026-10-30
**Status:** ACTIVE
**Program Director:** Nadia Solis
**Phase theme:** Close the loop — the platform has been tracking these threads since July; October is when they land.

---

## §1. Phase Mission

Phase 34 ended with three threads in flight. Each one is a different kind of close.

On October 1, Curtis Pallant will install the overhauled Power Turbine Inlet Housing in N4421T. The part is on the shelf at Ridgeline Air Maintenance. The 8130-3 is in the folder. Marcus has signed the pre-installation compliance review. This close has been building since the formal ALS audit in June, when the PTH showed up DUE_SOON with 2,153 cycles remaining and the platform said: *start the conversation now, before it becomes urgent.* The procurement advisory fired on August 1. The purchase order was issued August 10. The part arrived September 18. The installation is October 1. That is what the compliance lifecycle is supposed to look like: a year of lead time, a planned event, not a scramble.

On the HPAC side, the Power Turbine Stator for N521HPA Engine 1 arrived from Pacific Turbine Parts while Phase 34 was closing. Lorena needs to receive it formally, verify the 8130-3, and get Marcus's pre-installation sign-off before scheduling the installation event. The stator has 1,847 cycles remaining at entry — no urgency at the cycle level — but the same compliance workflow that served OI-33-01 applies here, and Phase 35 completes it through pre-installation clearance. The installation itself is a longer-horizon event, but the procurement loop closes when the compliance clearance is on file.

The third thread is new: Paul Kaminski and Walker Field Aviation Services come on-platform as the 9th Athelon shop. The onboarding is the most logistically straightforward in the network's history — the C208B / PT6A-114A template is live and validated, Dale Renfrow is twenty meters across the ramp and has offered to answer questions, and Paul's November C208B 200-hour inspection for N416AB is the concrete milestone driving the timeline. Both Caravans need ALS boards before that date. The piston fleet data entry follows. Phase 35 puts Walker Field through the same Day 1 session that HPAC, Ridgeline, and RMTS went through before them — and for the first time, it does so with an airport peer already in the system.

On the product side, v1.5 Sprint 3 completes the two features that Sprint 2 began. F-1.5-D Phase 2 extends the Regulatory Change Tracking system with SB/revision tracking and the full DOM confirmation workflow that Marcus has been designing since the Phase 32 scoping session — the workflow that takes an AD from alert through confirmation through ALS item update in one integrated path. F-1.5-E Sprint 3 delivers the Cross-Shop Protocol Sharing adoption workflow that the Walker Field / Dale Renfrow pairing is waiting to use: a shop DOM can adopt a base template, create a derived shop-level protocol, customize the optional steps, and have the required steps enforced by the platform. Walker Field will be the UAT candidate — the actual first use of the feature at the actual first intra-airport protocol sharing relationship in the network. FR-34-01 (core deposit tracking subfield) and FR-34-02 (matched keyword display in AD alerts) round out the sprint.

Miles Beaumont's seventeenth dispatch closes the phase. The story is the October 1 installation — OI-33-01 complete, the PTH counter reset, N4421T returned to service with a new 12,500-cycle clock. And the 9th shop: Walker Field Aviation, the shop across the ramp, the protocol already waiting for them.

Phase 35 runs four workstreams across five weeks.

---

## §2. Open Items Entering Phase 35

| ID | Item | Entering Status | Phase 35 Track |
|---|---|---|---|
| OI-33-01 | N4421T PTH — Part on shelf at KRTS; 8130-3 VERIFIED; Marcus pre-installation clearance issued; installation target 2026-10-01 | OPEN — PRE-INSTALLATION | WS35-B: installation event; ALS board reset; WO-RDG-003 close; OI-33-01 CLOSE |
| OI-33-02 | N521HPA Engine 1 Power Turbine Stator — PO-HPAC-002-A issued; part delivered 2026-09-13; receipt and pre-installation review pending | OPEN — DELIVERED (pre-receipt Phase 35) | WS35-B: formal parts receipt; 8130-3 verification; Marcus pre-installation compliance review; pre-installation clearance issued |
| OI-34-01 | King Air B200 ALS template — SB1837 ESN-conditional flag to be added (from OI-33-02-COMP-001) | OPEN — MINOR | Phase 35 Marcus action during WS35-B; before OI-33-02 pre-installation review |
| FR-34-01 | Core deposit tracking subfield on Procurement WO | v1.5 Sprint 3 backlog | WS35-C: Sprint 3 build |
| FR-34-02 | Show matched keywords in AD alert notification | v1.5 Sprint 3 backlog | WS35-C: Sprint 3 build |
| FR-34-03 | F-1.5-D Phase 2: SB/revision tracking + full DOM confirmation workflow | v1.5 Sprint 3 anchor | WS35-C: Sprint 3 F-1.5-D Phase 2 |
| FR-34-04 | F-1.5-E shop adoption/template fork workflow | v1.5 Sprint 3 anchor | WS35-C: Sprint 3 F-1.5-E adoption |
| P-34-01 | Walker Field Aviation Services — qualified; Phase 35 onboarding authorized; November C208B 200-hr target | AUTHORIZED | WS35-A: full onboarding |

---

## §3. Workstream Plans

### §3.1 WS35-A — Walker Field Aviation Services Onboarding (9th Shop)

**Owner:** Nadia Solis (program lead), Marcus Webb (compliance review)
**Supporting:** Paul Kaminski (DOM, Walker Field); Dale Renfrow (airport peer, available for Q&A); Devraj Anand (technical setup); Cilla Oduya (onboarding QA)
**Timeline:** 2026-09-26 through 2026-10-23 (C208B ALS boards live before 2026-11-01 200-hr target)
**Status:** ⬜ PLANNED

**Context:** Walker Field Aviation Services is the 9th Athelon shop. Paul Kaminski qualified 4.4/5 in WS34-D. The C208B / PT6A-114A template is live and validated. No template build required. The onboarding scope is the most technically routine in Athelon's history — but Paul Kaminski's character profile (deliberate, question-first, will validate carefully) means the onboarding session requires genuine attentiveness, not a template run-through.

**Onboarding scope:**

1. **Marcus pre-onboarding gap brief** (2026-09-29 target): 60-minute call, Paul + Marcus. Cover: Athelon's Part 145 compliance surface; C208B / PT6A-114A ALS structure (29-item board, identical to Dale Renfrow's RMTS N416AB boarding); the SB1837 note that applies to the PT6A-114A (a different SB than the PT6A-42 OI-33-02 finding, but the same principle — service-bulletin-modified configurations require ESN-conditional tracking); FSDO Export functionality; AD alert system now live (PT6A-114A will receive any new AD notifications from Day 1). Piston fleet overview.

   Paul should understand the compliance surface before he signs scope. He will interrogate it. Let him.

2. **Scope agreement** (WFAS-SCOPE-001, 2026-10-02 target): Nadia issues the scope document. Walker Field scope: Part 145 only (no Part 135 certificate — no dual-cert complexity). Aircraft scope: C208B N416AB, C208B N416TE, 4x C172S, PA-28-181, PA-32-301FT. Deferred items: none material (all aircraft types supported; no template build required).

3. **Account creation and shop configuration** (2026-10-05 target): Devraj creates the Walker Field shop environment. Paul Kaminski configured as DOM. PT6A-114A ALS template pre-loaded. FSDO certificate data entered (Part 145, limited aircraft, Denver FSDO).

4. **Day 1 data entry — C208B fleet** (2026-10-07 target): Paul Kaminski leads the data entry session for N416AB and N416TE, the two Cessna 208B Caravans. This is the priority data entry — ALS boards must be live before the November 200-hr inspection. Marcus and Nadia on standby (remote). Expect 29 ALS items per aircraft (58 total for the Caravan fleet). Field validation: Paul will validate against his logbooks during entry, following the same discipline Lorena demonstrated at HPAC. Any discrepancies found should be flagged and resolved before the boards go active.

   **Critical milestone:** Both C208B ALS boards ACTIVE before 2026-10-31 (before the November 1 200-hr target).

5. **Day 2 data entry — piston fleet** (2026-10-14 target): Enter data for the 4x C172S, PA-28-181, and PA-32-301FT. Less ALS-intensive than the Caravan fleet. Estimated session time: 3–4 hours. If any ALS findings are surfaced (as they were at HPAC and Ridgeline on Day 1), WOs are opened and tracked.

6. **Base template adoption (F-1.5-E, Sprint 3):** Walker Field will be the first shop to use the Sprint 3 adoption workflow to derive a shop-level protocol from the PT6A-114A combustion liner borescope base template. This is the UAT use case for FR-34-04. Timing: Sprint 3 ships target 2026-10-20. Paul should adopt the base template before the November 200-hr so the borescope protocol is live when needed.

7. **Dale Renfrow engagement:** Dale is twenty meters across the KGJT ramp. Nadia should encourage Paul to use Dale as a resource for KGJT-specific workflow questions (ramp procedures, local FSDO expectations, PT6A-114A maintenance practices). Dale offered. Use it. The 9th shop should not feel like a solo onboarding.

**Exit criteria:**
- WFAS-SCOPE-001 signed
- Walker Field shop environment configured in Athelon
- C208B ALS boards (N416AB, N416TE): ACTIVE before 2026-10-31
- Piston fleet ALS boards: ACTIVE (all 6 aircraft)
- Marcus pre-onboarding gap brief: COMPLETE
- Any Day 1 / Day 2 ALS findings: WOs opened and logged
- Base template adoption initiated (Sprint 3 dependency; adoption workflow to be used as FR-34-04 UAT)

**Artifact path:** `phase-35-v15/ws35-a-walker-field-onboarding.md`

---

### §3.2 WS35-B — OI-33-01 PTH Installation (N4421T) + OI-33-02 Stator Receipt & Pre-Installation (N521HPA)

**Owner:** Marcus Webb (compliance, both OIs); Curtis Pallant (OI-33-01 installation, Ridgeline); Lorena Vásquez (OI-33-02 receipt + pre-installation, HPAC)
**Supporting:** Devraj Anand (ALS board updates at installation events)
**Timeline:** 2026-09-26 through 2026-10-30
**Status:** ⬜ PLANNED

#### OI-33-01 — N4421T Power Turbine Inlet Housing Installation (2026-10-01)

**Context:** This is the event the Phase 33 procurement advisory was designed to produce: a planned, documented, compliant replacement of a life-limited turbine component, on a scheduled 200-hr inspection, with parts documentation already on file. The PTH has been on the shelf at KRTS since September 18. The compliance chain from advisory to installation spans fourteen months. The installation is the last step.

**Installation event scope:**

1. **Installation (2026-10-01, N4421T 200-hr inspection):** The Power Turbine Inlet Housing installation is performed during N4421T's 200-hr inspection. The installing technician is expected to be Renard Osei (A&P at Ridgeline) under Curtis Pallant's IA supervision and sign-off authority (IA-NV-2241). Work per P&WC PT6A-66D EMM §72-00-00 (Power Turbine Section). The old PTH — P/N 3053174, accumulated 10,347+ cycles — is removed and retired from service.

2. **Cycle counter reset and ALS board update (2026-10-01):** At installation, Curtis updates WO-RDG-003 with the installation date, the new part's S/N (PTP-PTH-20244), and the installation cycle count on N4421T. Athelon ALS board PTH-01 resets:
   - Old counter: accumulated cycles since 2013-08-14 → retired at limit (or just under; Marcus confirmed 12,500-cycle life)
   - New counter: 0 cycles SMOH, from 2026-10-01
   - New life limit: 12,500 cycles from 2026-10-01
   - New ALS status: COMPLIANT
   - New projected limit date: ~2040 (at ~50 cycles/month N4421T utilization — well beyond the planning horizon)

3. **WO-RDG-003 close:** Curtis performs the pre-close checklist on WO-RDG-003 — the procurement tracking WO that has been open since Phase 33. All checklist items complete: work entry logged, old part retired (P/N, S/N, accumulated cycles documented), new part installed (P/N 3053174, S/N PTP-PTH-20244, 0 SMOH, 8130-3 on file and VERIFIED), approved data reference logged (P&WC PT6A-66D EMM §72-00-00), IA sign-off. Curtis presses SIGN AND CLOSE. WO-RDG-003: CLOSED.

4. **OI-33-01 close:** With WO-RDG-003 closed and the ALS board reset, Marcus formally closes OI-33-01. The open item that has been active since June 2026 — formally registered since the Phase 32 ALS audit — closes on October 1. The procurement advisory proved its value. The compliance lifecycle closed cleanly.

**Marcus note on installation clock:** The new life limit clock (12,500 cycles from installation date) starts on the **installation date**, not the overhaul date. Curtis must log the installation date precisely. The overhaul date (2026-07-22) is the 8130-3 reference date; it is not the life limit start date.

**Exit criteria for OI-33-01:**
- PTH installation completed per P&WC PT6A-66D EMM §72-00-00
- WO-RDG-003: CLOSED (pre-close checklist complete; IA sign-off; RTS)
- ALS board PTH-01: COMPLIANT; counter reset to 0 SMOH; new life limit clock from 2026-10-01
- N4421T: returned to service from 200-hr inspection
- OI-33-01: CLOSED

---

#### OI-33-02 — N521HPA Engine 1 Power Turbine Stator: Receipt + Pre-Installation Review

**Context:** The Power Turbine Stator (P/N 3027842-01, SB1837 configuration, 0 SMOH) from Pacific Turbine Parts was delivered to HPAC on 2026-09-13, within the delivery window. The part has not yet been formally received in Athelon — the delivery occurred in the Phase 34 close window and receipt was identified as Phase 35 scope. Phase 35 completes the receipt and pre-installation compliance chain.

**Receipt and pre-installation scope:**

1. **Formal parts receipt (2026-09-26 through 2026-10-02):** Lorena Vásquez performs the incoming parts inspection on the stator: confirm P/N (3027842-01), S/N (PTP-PTSA-40882), overhaul date, SMOH count at delivery, 8130-3 review. Logs receipt in Athelon WO-HPAC-002 using the F-1.5-C procurement subfields (8130-3Status: RECEIVED → to be updated to VERIFIED after Marcus review). Photos of 8130-3 uploaded to WO-HPAC-002.

2. **King Air B200 ALS template update — SB1837 ESN-conditional flag (OI-34-01, Marcus action, 2026-10-02 target):** Per OI-33-02-COMP-001, the SB1837 Power Turbine Stator life limit is ESN-conditional — it applies only to engines that have had the SB1837 stator replacement. Marcus adds the conditional flag to the King Air B200 / PT6A-42 ALS template before the pre-installation review is filed, so the template reflects the correct conditional logic for future data entry sessions.

3. **Marcus pre-installation review (2026-10-05 through 2026-10-09 target):** Marcus reviews Lorena's parts receipt documentation and issues the pre-installation compliance review for WO-HPAC-002. Same framework as OI-33-01-PRE-INSTALL-001:
   - P/N confirmed per SB1837 replacement configuration
   - 8130-3 reviewed: overhaul facility (Pacific Turbine Parts, PA-2994), overhaul date, SMOH at delivery, 8130-3 completeness
   - Physical condition confirmed (from Lorena's inspection report)
   - No open P&WC SBs requiring pre-installation action
   - ALS board update instruction: at installation, HPAC-K1-PTS-01 resets; new life limit is 3,600 cycles from installation date; cycles-since-overhaul at installation becomes starting point

4. **Pre-installation clearance issued:** Marcus issues OI-33-02-PRE-INSTALL-001. WO-HPAC-002 8130-3Status: VERIFIED. Part cleared for installation.

5. **Installation planning:** Unlike OI-33-01 (which has a concrete imminent installation date), the N521HPA stator has 1,847 cycles remaining — roughly 26 months at ~70 cycles/month. The installation is not urgent. The Part Exchange agreement with Pacific Turbine Parts requires the core (the outgoing stator) to be returned within the agreed core return window. Lorena should check the core return terms in PO-HPAC-002-A and flag if a return timeline constraint drives the installation date earlier than the cycle schedule would suggest. Marcus will note any core return timing in the pre-installation memo.

   Phase 35 OI-33-02 scope is **receipt through pre-installation clearance**. Actual installation is a later open item.

**Exit criteria for OI-33-02 Phase 35 scope:**
- Parts receipt logged in WO-HPAC-002 (Lorena); 8130-3 uploaded
- OI-34-01 resolved: King Air B200 ALS template SB1837 flag added
- Marcus pre-installation review OI-33-02-PRE-INSTALL-001 issued
- WO-HPAC-002 8130-3Status: VERIFIED
- Core return timeline confirmed (if constraint exists, flagged as new open item)

**Artifact path:** `phase-35-v15/ws35-b-oi3301-pth-install-oi3302-stator-preinstall.md`

---

### §3.3 WS35-C — v1.5 Sprint 3 (F-1.5-D Phase 2 + F-1.5-E Adoption Workflow + FR-34-01/02 Polish)

**Owner:** Devraj Anand (engineering lead), Cilla Oduya (QA)
**Supporting:** Marcus Webb (compliance review); Chloe Park + Finn Calloway (UI); Jonas Harker (release gate)
**UAT:** Curtis Pallant (Ridgeline), Lorena Vásquez (HPAC), Paul Kaminski (Walker Field — F-1.5-E adoption), Dale Renfrow (RMTS — F-1.5-E protocol library)
**Timeline:** 2026-09-29 through 2026-10-20 (Sprint 3 build + test window)
**Release:** v1.5.0-sprint3 (Jonas release gate)
**Status:** ⬜ PLANNED

Sprint 3 is the last sprint in the v1.5 arc. It completes the two features Sprint 2 began and adds the polish items that field use generated. The sequencing is straightforward: Sprint 3 builds what Sprint 2 deferred and resolves the field-originated FRs that confirmed product direction.

---

#### §3.3.1 Thread 1 — F-1.5-D Phase 2: Regulatory Change Tracking (SB/Revision Tracking + Full DOM Confirmation Workflow)

**Feature ID:** F-1.5-D Phase 2
**Sprint 2 Phase 1 delivered:** AD API ingestion, keyword-based applicability matching, alert distribution layer, DOM confirm/dismiss workflow (basic)
**Phase 2 adds:** SB/revision tracking; full DOM confirmation workflow with ALS item update path; matched keyword display (FR-34-02)

**Phase 2 scope:**

1. **SB (Service Bulletin) tracking:** The FAA AD database is AD-centric, but the platform's compliance surface extends to manufacturer service bulletins (SBs) — particularly mandatory and alert-category SBs from P&WC, Continental, Lycoming, and Cessna/Textron that affect life-limited parts. Phase 2 adds an SB ingestion layer: Marcus can manually enter SBs relevant to the Athelon fleet (OEM pushes are not reliably machine-consumable; the Phase 2 approach is Marcus-curated). Devraj builds the `serviceBulletins` table and a Marcus admin entry interface. SBs can be linked to aircraft types and marked mandatory vs. alert vs. informational.

2. **Amendment re-alerting:** When a previously ingested AD is amended (Phase 1 stored amendments with an AMENDED flag), the system re-alerts DOMs who previously dismissed the original AD. The re-alert includes the prior dismissal rationale in context so the DOM can reassess whether the amendment changes their applicability determination.

3. **Full DOM confirmation workflow with ALS item update:** Phase 1 ended the confirm flow at "AD added to aircraft AD compliance board, status ACTION_REQUIRED." Phase 2 completes the path: when a DOM confirms an AD applicable, the system walks them through the compliance steps: identify the affected ALS items, link the AD to the relevant ALS items, and — if the AD requires a new inspection or replacement interval — prompt the DOM to enter the new compliance data. Marcus-designed workflow; his core ask since the Phase 32 scoping session.

4. **Matched keyword display (FR-34-02):** The Sprint 2 notification card now shows the keywords that triggered the match (e.g., *"matched on: PT6A-66D, TBM 850"*) alongside Marcus's disclaimer language. Requested by Cilla and Curtis after Sprint 2 deployment; adds transparency to the applicability matching result.

**Marcus's design requirement:** The full confirmation workflow must never tell the DOM what to enter in the ALS compliance fields — it guides, it prompts, but the DOM makes every compliance determination. The system can say *"This AD may affect life-limited parts on this aircraft — review the required actions"* but cannot say *"Set this life limit to X cycles."* That remains the DOM's decision.

**Test requirements (Cilla):** Sprint 3 F-1.5-D Phase 2 TC scope: minimum 18 TCs covering SB ingestion and retrieval, amendment re-alert for previously dismissed AD, full confirmation workflow with ALS item linkage, matched keyword display, and DOM-determination boundary (system guidance vs. system instruction).

---

#### §3.3.2 Thread 2 — F-1.5-E Shop Adoption Workflow (Sprint 3)

**Feature ID:** F-1.5-E Sprint 3 adoption workflow (FR-34-04)
**Sprint 2 Foundation delivered:** Protocol template data model, base template creation UI (Marcus admin), PT6A-114A base template v1.0 published, DOM read-only Protocol Library view
**Sprint 3 adds:** Shop adoption workflow; derived protocol creation; required step enforcement; template fork with customizable optional steps

**Adoption workflow scope:**

1. **"Adopt this template" action for DOM:** In the Protocol Library, a DOM can select a base template and click "Adopt this template." The system creates a shop-level derived protocol, pre-populated with all steps from the base template. Required steps are locked; optional steps are present but editable.

2. **Required step enforcement:** If a DOM attempts to remove a required step from a derived protocol, the system requires: (a) DOM authorization (IA credentials confirmed), (b) a documented rationale, and (c) a Marcus compliance team review flag on the modification. The modification can be saved but is flagged for review and included in the FSDO Export deviation log. Optional steps can be removed or added freely.

3. **Template version tracking:** If Marcus publishes a new version of a base template (e.g., PT6A-114A base template v1.1 after a P&WC EMM revision), shops with derived protocols receive an in-app notification: *"The base template for [engine type] has been updated. Review the changes and update your shop protocol if applicable."* The DOM decides whether to incorporate the changes.

4. **UAT — Walker Field Aviation Services (Paul Kaminski, FR-34-04):** Walker Field will be the first shop to use the adoption workflow in production. Devraj flags Walker Field as the UAT candidate in Phase 35 onboarding planning (per Devraj note WS34-D, 2026-09-12). Nadia and Marcus should coordinate with Paul to plan the adoption session to coincide with Sprint 3 deployment (target: 2026-10-20) and the Walker Field Day 2 data entry session. If Sprint 3 ships before Paul's Day 2, the base template adoption can be part of Day 2.

5. **Dale Renfrow acknowledgment:** Dale's PROTO-RMTS-001 is the base template. When Paul Kaminski adopts it and creates PROTO-WFAS-001 as his derived protocol, Dale's protocol has its first downstream fork. Marcus should notify Dale. The Protocol Library will show: base template PT6A-114A v1.0 (Marcus, from PROTO-RMTS-001) → adopted by Walker Field Aviation Services → PROTO-WFAS-001 (Paul Kaminski).

**Test requirements (Cilla):** Sprint 3 F-1.5-E adoption TC scope: minimum 16 TCs covering template adoption flow, derived protocol creation, required step lock enforcement (with override path), optional step modification, template version notification, and DOM-initiated adoption UAT with Walker Field scenario.

---

#### §3.3.3 Thread 3 — FR-34-01: Core Deposit Tracking Subfield + Polish

**Feature ID:** FR-34-01 (Lorena Vásquez, Sprint 2 UAT, 2026-09-12)

When Lorena adopted the F-1.5-C procurement subfields for WO-HPAC-002 (OI-33-02 stator procurement), she immediately asked for one more field: core deposit tracking. Both the N4421T PTH procurement (PO-RDG-PTH-001, $8,500 core deposit) and the N521HPA stator procurement (PO-HPAC-002-A, $8,500 core deposit) include core exchange agreements: Pacific Turbine Parts holds a core deposit and requires the old part returned in serviceable (or bare-core) condition within an agreed window. The current platform has no structured field for this.

**Sprint 3 addition to F-1.5-C subfields:**

```typescript
// Additional procurement subfield (Sprint 3 addition)
coreDepositAmount: v.optional(v.number()),      // in USD
coreReturnStatus: v.optional(v.union(
  v.literal("NOT_APPLICABLE"),
  v.literal("PENDING"),
  v.literal("RETURNED"),
  v.literal("CREDITED")
)),
coreReturnDueDate: v.optional(v.number()),       // Unix timestamp
corePartDescription: v.optional(v.string()),     // e.g., "PTH P/N 3053174 S/N [old]"
```

This is a small, focused addition to the existing WO schema. Cilla estimated 6 TCs. Devraj estimated one sprint day.

**Sprint 3 combined TC target:**
- F-1.5-D Phase 2: 18 TCs
- F-1.5-E Adoption: 16 TCs
- FR-34-01 Core Deposit: 6 TCs
- **Sprint 3 new TCs:** ~40 TCs
- Regression: 244 TCs (v1.5.0-sprint2 baseline)
- **Sprint 3 total estimate:** ~284 TCs

---

#### §3.3.4 Sprint 3 Sequencing

| Week | F-1.5-D Phase 2 (Reg. Change Phase 2) | F-1.5-E Adoption (Protocol Sharing) | FR-34-01 Polish |
|---|---|---|---|
| Week 1 (2026-09-29) | SB table design; amendment re-alert logic | Adoption flow UI design; required step enforcement design | Core deposit schema design |
| Week 2 (2026-10-06) | SB admin entry UI; amendment re-alert pipeline; matched keyword display | Derived protocol create; required step lock + override path | Core deposit UI; schema migration |
| Week 3 (2026-10-13) | Full confirmation workflow with ALS item linkage; Marcus workflow review | Template version notification; Cilla TC matrix; Walker Field UAT prep | Cilla TC matrix |
| Week 4 (2026-10-20) | Cilla Sprint 3 TC matrix; Marcus compliance sign-off; Jonas release gate | Walker Field UAT (Paul Kaminski adoption session); Dale Renfrow acknowledgment | Integration; Jonas release gate |
| Sprint 3 ship (2026-10-20) | Jonas release gate; v1.5.0-sprint3 deployment to all shops | Jonas release gate; v1.5.0-sprint3 | Jonas release gate; v1.5.0-sprint3 |

**Artifact path:** `phase-35-v15/ws35-c-v15-sprint3.md`

---

### §3.4 WS35-D — Miles Beaumont, Seventeenth Dispatch

**Owner:** Miles Beaumont
**Filing target:** 2026-10-25 (end of phase; post-sprint-3 deployment + post-OI-33-01 installation)
**Status:** ⬜ PLANNED

**Theme: Close the loop — and open the next one**

The seventeenth dispatch lives at the intersection of two closings and one opening. This is the month the procurement loop completes: OI-33-01, fourteen months from advisory to installation. The PTH is installed, the counter resets, and N4421T returns to service with a clean ALS board and a new 12,500-cycle clock. The month that a shop starts from spreadsheet to live platform for the ninth time, except this time the shop is across the ramp from another shop that already went through it. And the month that a borescope protocol written by Dale Renfrow in 2026 becomes the reference standard for the same engine type running at a different shop's hangar.

**Scene 1 — The October 1 installation:** Curtis Pallant, Renard Osei, and the N4421T 200-hr inspection. The PTH comes off. The overhauled part goes in. Curtis enters the installation date in Athelon, and the ALS board for PTH-01 resets from DUE_SOON to COMPLIANT. The counter shows: 0 cycles. Life limit: 12,500 from 2026-10-01. The advisory that fired on August 1 of last year has been resolved by a part that's been on the shelf for two weeks, cleared by a compliance review issued in September, sourced from a purchase order issued in August. The system ran from front to back. Nothing was close. Nothing was urgent. That is the point.

**Scene 2 — Paul Kaminski's Day 1:** Walker Field Aviation, KGJT, Day 1 data entry. Paul enters the N416AB PT6A-114A ALS board. Nadia is on standby. Marcus has sent the gap brief. Dale Renfrow is twenty meters across the ramp. If Paul finds something — and if the pattern holds, he will — he opens a work order. The ninth shop joins the network not through a press release but through a data entry session that takes four hours and may or may not find a discrepancy in a logbook.

**Structural arc:** Miles Beaumont's thesis for the seventeenth dispatch: closing the loop is only significant if you already understood what the loop was. The PTH advisory-to-installation cycle makes sense now because the Phase 33 advisory, the Phase 33 PO, the Phase 34 parts receipt, and the Phase 35 installation are documented. If you'd walked into KRTS in October 2026 without knowing any of that history, you would see: mechanic installs a part; DOM signs off. Standard turbine maintenance. The record in Athelon is what makes it visible as the conclusion of a fourteen-month tracked compliance cycle. That's what the platform is for.

**Artifact path:** `phase-35-v15/dispatches/dispatch-35.md`

---

## §4. Phase 35 Workstream Table

| Workstream | Status | Artifact Path | Owner(s) |
|---|---|---|---|
| Phase 34 Gate Review | ✅ DONE — GO | reviews/phase-34-gate-review.md | Review Board |
| WS35 Plan | ✅ DONE | phase-35-v15/ws35-plan.md | Nadia + Marcus + Devraj + Cilla + Jonas |
| WS35-A Walker Field Aviation Services Onboarding (Paul Kaminski, KGJT CO — 9th shop; C208B ALS boards live before November 200-hr) | ⬜ PLANNED | phase-35-v15/ws35-a-walker-field-onboarding.md | Nadia + Marcus + Paul Kaminski + Dale Renfrow |
| WS35-B OI-33-01 PTH Installation (N4421T, 2026-10-01) + OI-33-02 Stator Receipt + Pre-Installation Review (N521HPA) | ⬜ PLANNED | phase-35-v15/ws35-b-oi3301-pth-install-oi3302-stator-preinstall.md | Marcus + Curtis Pallant + Lorena Vásquez |
| WS35-C v1.5 Sprint 3 — F-1.5-D Phase 2 Regulatory Change Tracking + F-1.5-E Shop Adoption Workflow + FR-34-01 Core Deposit Polish | ⬜ PLANNED | phase-35-v15/ws35-c-v15-sprint3.md | Devraj + Cilla + Marcus + Chloe + Finn + Jonas |
| WS35-D Miles Beaumont — Seventeenth Dispatch (OI-33-01 installation close; Walker Field Day 1; protocol loop complete) | ⬜ PLANNED | phase-35-v15/dispatches/dispatch-35.md | Miles Beaumont |

---

## §5. Phase 35 Timeline

| Week | Dates | WS35-A | WS35-B | WS35-C | WS35-D |
|---|---|---|---|---|---|
| Week 1 | 2026-09-26 to 10-02 | Marcus pre-onboarding gap brief (2026-09-29); scope agreement prep | OI-33-02: Lorena parts receipt + 8130-3 upload; OI-34-01 ALS template SB1837 flag (Marcus) | Sprint 3 design: F-1.5-D Phase 2 SB layer + F-1.5-E adoption flow + FR-34-01 core deposit | Scene research; OI-33-01 installation date confirmed |
| Week 2 | 2026-10-03 to 10-09 | WFAS-SCOPE-001 signed (2026-10-02); account creation (2026-10-05); Day 1 data entry scheduled | OI-33-01: **PTH INSTALLED (2026-10-01)**; WO-RDG-003 CLOSED; ALS board PTH-01 COMPLIANT; OI-33-01 CLOSED. OI-33-02: Marcus pre-installation review | Sprint 3 build: SB table + amendment re-alert + adoption flow + required step enforcement | Notes from PTH installation; Walker Field Day 1 scene setup |
| Week 3 | 2026-10-10 to 10-16 | Day 1 data entry — C208B fleet N416AB + N416TE (target: 2026-10-07 or 10-10) | OI-33-02: pre-installation clearance OI-33-02-PRE-INSTALL-001 issued; WO-HPAC-002 8130-3Status VERIFIED | Sprint 3 build: confirmation workflow ALS linkage + version notification + matched keyword display | Draft outline; Walker Field Day 1 scene |
| Week 4 | 2026-10-17 to 10-23 | Day 2 data entry — piston fleet; F-1.5-E adoption session (Sprint 3 UAT, Paul Kaminski) | Phase 35 gate review prep; OI-33-02 pre-install complete | Cilla Sprint 3 TC matrix; Marcus compliance sign-off; Jonas release gate; v1.5.0-sprint3 ship (2026-10-20) | First draft |
| Week 5 | 2026-10-24 to 10-30 | Phase 35 gate review prep; C208B ALS boards confirmed ACTIVE | Phase 35 gate review prep | Post-sprint monitoring; Sprint 3 post-release observations | Dispatch filing (2026-10-25) |

---

## §6. Phase 35 Exit Criteria

- **WS35-A:** Walker Field Aviation Services fully onboarded. WFAS-SCOPE-001 signed. C208B ALS boards (N416AB, N416TE) ACTIVE before 2026-10-31. Piston fleet ALS boards ACTIVE. Marcus gap brief complete. Any Day 1 / Day 2 findings logged as WOs. Base template adoption initiated (Sprint 3 F-1.5-E UAT).
- **WS35-B:** OI-33-01 — PTH installed 2026-10-01; WO-RDG-003 CLOSED; ALS board PTH-01 COMPLIANT (counter reset); N4421T returned to service; **OI-33-01 CLOSED.** OI-33-02 — Parts receipt logged; 8130-3 VERIFIED; OI-34-01 resolved (ALS template SB1837 flag); Marcus pre-installation clearance OI-33-02-PRE-INSTALL-001 issued.
- **WS35-C:** F-1.5-D Phase 2 (SB tracking, amendment re-alert, full confirmation workflow, matched keyword display), F-1.5-E adoption workflow (shop adoption, required step enforcement, template version notification), and FR-34-01 core deposit subfield shipped. Cilla sign-off ✅. Marcus compliance clearance ✅. Jonas release gate ✅. UAT from named DOM contacts ✅ (including Walker Field adoption UAT).
- **WS35-D:** Seventeenth dispatch filed.
- **Phase 35 gate review:** Filed and GO verdict recorded.

---

## §7. Dependency Notes

- **WS35-A depends on:** WS34-D (Walker Field qualified); Sprint 3 F-1.5-E adoption workflow (Paul is the UAT candidate — coordinate timing); Dale Renfrow availability for Day 1 ramp peer support.
- **WS35-B OI-33-01 depends on:** OI-33-01-PRE-INSTALL-001 issued (Phase 34 ✅); Curtis Pallant's 200-hr inspection schedule; N4421T aircraft owner availability.
- **WS35-B OI-33-02 depends on:** Part delivery confirmed 2026-09-13 (Phase 34 close); Lorena Vásquez performing the incoming inspection; OI-34-01 (King Air B200 template SB1837 flag) resolved by Marcus before pre-installation review is filed.
- **WS35-C F-1.5-E adoption depends on:** WS35-A Walker Field onboarding progressing to the adoption session; Sprint 2 F-1.5-E Foundation (shipped ✅); Dale Renfrow acknowledgment of PROTO-WFAS-001 fork.
- **WS35-D depends on:** WS35-B OI-33-01 installation event (primary scene material); WS35-A Day 1 data entry (secondary scene). Both must deliver before dispatch draft can finalize.

---

## §8. Characters Active in Phase 35

**Returning:**
- Nadia Solis — Program Director; leads WS35-A Walker Field onboarding relationship
- Marcus Webb — Compliance; OI-33-01 installation sign-off; OI-33-02 pre-installation review; Sprint 3 compliance review; ALS template SB1837 flag (OI-34-01)
- Devraj Anand — Engineering Lead; Sprint 3 build (all threads); ALS board updates at installation events
- Cilla Oduya — QA Lead; Sprint 3 TC matrix + sign-off
- Jonas Harker — Release/Infrastructure; Sprint 3 release gate
- Chloe Park + Finn Calloway — UI; Sprint 3 adoption workflow UI + Phase 2 AD confirmation workflow
- Lorena Vásquez — DOM/IA, HPAC; OI-33-02 parts receipt; Sprint 3 UAT (F-1.5-D Phase 2 confirmation workflow)
- Curtis Pallant — DOM, Ridgeline; OI-33-01 installation event (supervising IA); Sprint 3 UAT
- Renard Osei — A&P, Ridgeline; performing OI-33-01 PTH installation work
- Dale Renfrow — RMTS, KGJT; peer introduction for Paul Kaminski during Walker Field onboarding; acknowledged base template author (PROTO-RMTS-001 → PT6A-114A base template v1.0)
- Miles Beaumont — Seventeenth dispatch

**New primary:**
- **Paul Kaminski** — DOM, Walker Field Aviation Services (KGJT, Grand Junction CO). 9th Athelon shop. Two C208Bs + piston fleet. November 200-hr target. First shop to adopt the PT6A-114A base template through the Sprint 3 adoption workflow.

---

## §9. v1.5 Backlog Status (Phase 35 Entry)

| Rank | Feature | Phase 35 Action | Status |
|---|---|---|---|
| 1 | Regulatory Change Tracking (F-1.5-D) | **WS35-C Sprint 3 Phase 2** — SB tracking + amendment re-alert + full confirmation + ALS linkage + matched keyword display | ⬜ PLANNED (Phase 2) |
| 2 | FSDO Audit Export Improvements (F-1.5-A) | ✅ DONE Sprint 1 | Shipped v1.5.0-sprint1 |
| 3 | Cross-Shop Protocol Sharing (F-1.5-E) | **WS35-C Sprint 3** — shop adoption workflow + required step enforcement + template version notification; Walker Field UAT | ⬜ PLANNED (adoption) |
| 4 | Part 135 Deeper Integration | NOT in Phase 35 | Backlog (pending Priya Sharma discovery call; longer horizon) |
| 5 | Mobile Ramp-View Quick ALS Card (F-1.5-B) | ✅ DONE Sprint 1 | Shipped v1.5.0-sprint1 |
| — | Procurement Subfields (F-1.5-C) | ✅ DONE Sprint 2 | Shipped v1.5.0-sprint2 |
| — | FR-34-01 Core Deposit Tracking | **WS35-C Sprint 3 polish** | ⬜ PLANNED |
| — | FR-34-02 Matched Keywords in AD Alert | **WS35-C Sprint 3** | ⬜ PLANNED |
| 7 | Multi-Shop Analytics | Architecture investment; not in Phase 35 | Longer horizon |

---

## §10. Network Status at Phase 35 Entry

| Shop | DOM / IA | Location | Certificate | Aircraft Types | Active Since |
|---|---|---|---|---|---|
| Desert Sky Turbine | Frank Nguyen, DOM | Scottsdale KSDL AZ | Part 145 | Jet (Citation), turboprop | Phase 24 |
| High Desert MRO | Bill Reardon, DOM | Prescott KPRC AZ | Part 145 | Piston single + twin | Phase 21 |
| Priya Sharma SPEA Air | Priya Sharma, DOM | KRAL AZ | Part 91 (Part 145 scoped) | Piston, Part 135 | Phase 22 |
| Lone Star Rotorcraft | Sandra Okafor, DOM | Fort Worth KFTW TX | Part 91 (Bell, Sikorsky) | Helicopter (Bell 206B-III, S-76C) | Phase 26 |
| Rocky Mountain Turbine Service | Dale Renfrow, DOM | Grand Junction KGJT CO | Part 145 | Cessna 208B (PT6A-114A), piston | Phase 29 |
| Ridgeline Air Maintenance | Curtis Pallant, DOM | Reno-Stead KRTS NV | Part 145 VRRS3941 | TBM 850, Cessna 208B, piston | Phase 31 |
| High Plains Aero & Charter | Lorena Vásquez, DOM/IA | Pueblo KPUB CO | Part 145 + Part 135 | King Air B200 (PT6A-42), piston | Phase 33 |
| Walker Field Aviation Services | Paul Kaminski, DOM | Grand Junction KGJT CO | Part 145 | Cessna 208B (PT6A-114A), piston | Phase 35 (onboarding) |

**Network size at Phase 35:** 8 shops active (9th onboarding). 2 airports with multiple Athelon shops (KGJT: RMTS + Walker Field; KPUB: HPAC only, but note KGJT is the first intra-airport multi-shop situation). Platform version: v1.5.0-sprint2 (Sprint 3 target: 2026-10-20).

---

*WS35 Plan complete. Phase 35 authorized by Phase 34 gate review (GO UNCONDITIONAL, 2026-09-25). Phase 35 open: 2026-09-26. Phase theme: close the loop — the platform has been tracking these threads since July; October is when they land. Proof case: OI-33-01 installation, N4421T PTH, Ridgeline Air Maintenance KRTS, 2026-10-01. Fourteen months from advisory to close.*
