# WS33-B — N4421T TBM 850 Power Turbine Inlet Housing DUE_SOON Tracking
**Workstream:** WS33-B
**Open Item Reference:** OI-33-01 (elevated from OI-32-02 closure finding)
**Phase:** 33 / v1.5
**Aircraft:** N4421T — TBM 850, operated by Ridgeline Air Maintenance (KRTS, Reno-Stead NV)
**Engine:** P&WC PT6A-66D (S/N PCE-RB0449)
**Component:** Power Turbine Inlet Housing
**ALS Item:** PTH-01 (Athelon ALS board ID)
**Cycles remaining at audit date:** 2,153 (as of 2026-06-23)
**Replacement window:** ~2027-08-01 (estimated)
**Owner:** Marcus Webb (compliance advisory), Curtis Pallant (DOM, Ridgeline), Devraj Anand (procurement advisory feature)
**Status:** ✅ DONE — Procurement advisory issued, WO preparation underway, formal tracking active

---

## §1. Background: How OI-33-01 Was Generated

### §1.1 The N4421T ALS Audit (OI-32-02, closed 2026-06-23)

In Phase 32, Marcus Webb conducted the first formal TBM 850 / PT6A-66D ALS audit for Ridgeline Air Maintenance as part of OI-32-02. The audit reviewed the P&WC PT6A-66D Engine Maintenance Manual and TCDS E1WE, identified three previously-missed ALS items, corrected one life-limit entry, and produced a complete 47-item ALS board for N4421T.

The audit was triggered by the formal turbine audit protocol (OI-32-02-P01) established in Phase 32: *a formal ALS audit is required within 60 days of initial ALS entry for all turbine aircraft.* N4421T had been entered in Phase 31 (Ridgeline onboarding) with ALS data transcribed from Curtis Pallant's logbook summaries. The formal audit was the check on that transcription.

The audit found four items requiring action:
1. **Gas Generator Case Assembly** — missing entirely from initial entry; added.
2. **Power Turbine Inlet Housing** — the most significant finding; see §1.2.
3. **Rudder Torque Box** — missing; added.
4. **Main Landing Gear Side Stay** — life limit entered as 15,200 cycles; corrected to 14,800 cycles per TCDS.

### §1.2 The Power Turbine Inlet Housing Finding

At audit date (2026-06-23), the PT6A-66D engine log showed:
- **Component:** Power Turbine Inlet Housing (P/N 3053174)
- **Life limit:** 12,500 cycles (per P&WC EMM §05-10, PTH mandatory retirement limit)
- **Accumulated cycles at audit:** 10,347 cycles
- **Remaining cycles:** 2,153 cycles
- **Projected replacement date:** Based on N4421T's rolling 12-month average of 180 cycles/month, the housing reaches its limit at approximately month 11.96 from audit date — i.e., ~**2027-06-16** (conservative) to **~2027-08-01** (current utilization rate with margin).

**ALS board status posted 2026-06-23:** `DUE_SOON` (threshold: ≤2,500 cycles; time-based threshold: ≤18 months)

**Athelon procurement advisory triggered automatically:** The F-1.4-E Procurement Lead Time Awareness feature (shipped v1.4.3-sprint3) evaluates DUE_SOON items against lead time thresholds configured by aircraft type. For turbine critical life-limited parts, the default advisory trigger is 12 months before the projected replacement window.

**Calculation:**
- Audit date: 2026-06-23
- Projected replacement: ~2027-08-01
- Advisory trigger point (12 months before replacement): ~**2026-08-01**
- **Time from audit date to advisory trigger: 39 days**

The advisory was going to fire in 39 days. Marcus flagged it as OI-33-01 immediately.

---

## §2. OI-33-01 — Formal Item Register

**OI Reference:** OI-33-01
**Opened:** 2026-06-23 (at close of OI-32-02 formal audit)
**Elevated to Phase 33 active tracking:** 2026-07-16
**Aircraft:** N4421T (TBM 850, Ridgeline Air Maintenance, KRTS)
**Engine:** PT6A-66D S/N PCE-RB0449
**Component:** Power Turbine Inlet Housing, P/N 3053174
**Limit:** 12,500 cycles (mandatory retirement — not a CMR; not overridable)
**Status at OI opening:** 10,347 cycles accumulated; 2,153 remaining; DUE_SOON
**Replacement window:** ~2027-08-01 (nominal); 2027-06-16 (conservative, 180 cy/month)
**Procurement advisory trigger:** ~2026-08-01 (12 months before nominal replacement)
**Owner:** Marcus Webb (compliance advisory), Curtis Pallant (DOM, procurement decision)
**Priority:** HIGH — mandatory life limit; no extension possible

---

## §3. The Procurement Advisory (2026-08-01)

### §3.1 Advisory Generation

At 06:14 MT on 2026-08-01, the Athelon F-1.4-E Procurement Lead Time Awareness engine ran its daily sweep. It evaluated all DUE_SOON ALS items across all seven active shops. For N4421T PTH-01:

- Remaining cycles at sweep: 2,098 (updated from logged flight operations at Ridgeline)
- Days until projected limit (at 180 cy/month rolling average): **~11.7 months**
- 12-month procurement advisory threshold: **MET**
- Advisory status: **PROCUREMENT_ADVISORY_ACTIVE**

**Advisory notification sent to:**
- Curtis Pallant, DOM (primary)
- Marcus Webb (compliance — copy)

**Advisory content (verbatim from Athelon notification):**

---

> **🔔 Procurement Advisory — N4421T Power Turbine Inlet Housing**
>
> **Aircraft:** N4421T (TBM 850)
> **Component:** Power Turbine Inlet Housing P/N 3053174
> **Engine:** PT6A-66D S/N PCE-RB0449
> **Life limit:** 12,500 cycles (mandatory retirement)
> **Current cycles:** 10,402 (as of last logged flight, 2026-07-31)
> **Remaining:** 2,098 cycles
> **Projected replacement:** ~2027-08-01 (based on 180 cy/month 12-month rolling average)
> **Time to replacement:** ~11.7 months
>
> **Advisory:** Based on current utilization and typical part procurement lead times for PT6A series turbine components, Athelon recommends initiating procurement planning for this part now.
>
> **Estimated lead times (P&WC authorized distributor, turbine life-limited parts):**
> - Standard availability (new): 4–8 months (parts availability dependent on P&WC production cycle)
> - Exchange/rotable availability: 2–4 months (dependent on serviceable pool)
> - AOG priority availability: variable; not a planning assumption
>
> **Recommendation:** Open a procurement tracking work order no later than 2026-09-01 to allow a minimum 8-month sourcing window before the projected replacement date.
>
> **Note:** Power Turbine Inlet Housing is a P&WC mandatory retirement item. Life limit of 12,500 cycles is not extendable by STC, owner operator authority, or waiver. Replacement at or before the life limit is mandatory per the PT6A-66D Engine Type Certificate (TCDS E1WE) and associated ICA.
>
> *Athelon ALS Advisory System v1.4.3 — OI-33-01 tracking active*

---

### §3.2 Curtis Pallant's Reaction

Curtis Pallant read the advisory on his phone at 6:45 AM while drinking coffee in the Ridgeline hangar break room. He'd been running the TBM 850 for three years. He knew the Power Turbine Inlet Housing had a life limit. He knew, in the general sense that experienced DOMs carry around in their heads, that it was *going to need replacement sometime.* What he hadn't done was calculate the replacement window against the current cycle count, against the lead time, against a calendar.

He forwarded the advisory to his desk email and sent a message to Marcus.

**Curtis to Marcus (text, 2026-08-01, 06:52 MT):**
*"Got the PTH advisory. 11.7 months is less room than I thought. Is 8 months actually realistic for a new part from P&WC or should I be going rotable?"*

**Marcus reply (08:15 MT):**
*"Honest answer: for a new PTH at current P&WC production rates, 6–8 months is realistic for standard priority, not guaranteed. Rotable pool at standard overhauled spec is typically 2–4 months, but availability varies. If you want certainty of supply, I'd start with a rotable inquiry today and keep new as a fallback. The advisory is right that 2026-09-01 is the latest you'd want to open a formal procurement WO. Can do it today if you want."*

**Curtis:**
*"Let's do it today."*

---

### §3.3 Work Order WO-RDG-003 (Procurement Tracking)

**WO-RDG-003** — opened 2026-08-01 by Curtis Pallant
- **Type:** Planned — Life-Limited Part Procurement (non-urgent, scheduled replacement)
- **Aircraft:** N4421T (TBM 850)
- **Engine:** PT6A-66D S/N PCE-RB0449
- **Part:** Power Turbine Inlet Housing P/N 3053174
- **ALS Item:** PTH-01 (Athelon board reference)
- **Life limit:** 12,500 cycles
- **Current cycles:** 10,402 (as of 2026-07-31 last log)
- **Projected replacement date:** 2027-06-01 to 2027-08-01 (window based on utilization)
- **WO type:** Procurement Preparation — no physical work yet; tracks sourcing status, quotes, and purchase order milestones
- **Assigned:** Curtis Pallant (DOM, procurement decision); Marcus Webb (compliance oversight)
- **Status:** OPEN — PROCUREMENT PHASE

---

## §4. Procurement Research (2026-08-01 through 2026-08-11)

### §4.1 Devraj Anand — Platform Feature Note

The WO-RDG-003 opening was the first time a shop used Athelon's F-1.4-E Procurement Lead Time feature to generate a formal work order from a procurement advisory. Devraj Anand noted the event in the sprint retrospective:

*"The feature worked exactly as designed. Advisory fired at 12 months. Curtis opened the WO the same day. The platform didn't just tell him something was coming — it gave him enough time to do something about it. That's the whole point."*

Devraj also noted one UX gap surfaced by the event: the procurement WO type did not have a "Parts Inquiry Status" field — a trackable substate showing whether the DOM had contacted suppliers, received quotes, or placed a purchase order. He added it to the v1.5 backlog as FR-33-01.

---

### §4.2 Curtis Pallant's Procurement Research

**2026-08-01 — Initial inquiry:**
Curtis contacted three suppliers:
1. **Western Turbine Services (Reno NV)** — P&WC authorized service center; closest to KRTS
2. **Pacific Turbine Parts (Burbank CA)** — Known rotable pool for PT6A series
3. **Rocky Mountain Aircraft Parts (Grand Junction CO)** — Used for N416AB fuel selector valve (WO-RMTS-003); small inventory but responsive

**2026-08-05 — Quote responses:**

| Supplier | Part Type | Lead Time | Price |
|---|---|---|---|
| Western Turbine Services | New (P&WC factory) | 6–7 months from PO | $42,800 |
| Pacific Turbine Parts | Overhauled/serviceable rotable | 6–8 weeks from PO | $28,400 + $4,200 core | 
| Rocky Mountain Aircraft Parts | No inventory; referral to Pacific Turbine | N/A | N/A |

**Curtis analysis (logged in WO-RDG-003 notes field):**

> "Western Turbine new part: 6–7 month lead at $42.8K. That puts delivery around Feb–Mar 2027 if we order now, which gives a 3–5 month buffer before the projected replacement window. Acceptable but tight.
>
> Pacific Turbine rotable: 6–8 weeks, $28.4K + $4.2K core ($32.6K total, net of core return). If the core is serviceable, I get the core credit back. This is the better lead time option. I need to confirm the overhauled PTH meets P&WC airworthy serviceable standards and that it comes with appropriate certification documentation.
>
> My preference is the rotable for lead time reasons. I'm going to ask Marcus if there are any compliance considerations with a rotable PTH versus new from P&WC."

---

### §4.3 Marcus Compliance Review — Rotable PTH

**Marcus Webb (compliance note, 2026-08-07):**

*Rotable Power Turbine Inlet Housing for PT6A-66D — compliance review:*

*The PTH is a Part 33 life-limited part. Replacement with an overhauled/rotable part is acceptable if:*
1. *The rotable part is overhauled to P&WC standard overhaul specifications (MPC-8, PWC Document 3001792)*
2. *The part is returned to service with a properly executed FAA Form 8130-3 (or EASA Form 1 for imports) issued by the overhauling facility*
3. *The overhaul facility holds the appropriate P&WC service agreement for PT6A series overhaul*
4. *The new cycle counter for the rotable part is reset to the overhaul date — the life limit for a rotable part is tracked from the date of overhaul, not from the original manufacture date*

*Pacific Turbine Parts is a P&WC authorized overhaul facility. Their rotable pool parts are typically overhauled to zero-time serviceable standard. Curtis should request confirmation of:*
- *Overhaul date and current cycles since overhaul (should be near-zero for a freshly overhauled rotable)*
- *8130-3 documentation from the overhauling facility*
- *Confirmation of P&WC service agreement and overhaul authority*

*If Pacific Turbine can provide all three, the rotable is the recommended path: shorter lead time, lower cost, equivalent compliance posture.*

*Note: When the rotable PTH is installed on N4421T, the Athelon ALS record for PTH-01 must be updated: cycles accumulated at retirement (the core returned to Pacific Turbine) are logged; the replacement part's cycle counter starts at the overhaul date count (typically 0 for a freshly overhauled rotable). Marcus will review the updated ALS entry at installation.*

**Signed: Marcus Webb, Compliance Architect, 2026-08-07**

---

### §4.4 Pacific Turbine Parts Confirmation (2026-08-09)

Curtis followed up with Pacific Turbine Parts per Marcus's requirements.

**Pacific Turbine response (email summary, 2026-08-09):**
- Part P/N 3053174 available in rotable pool
- Overhauled 2026-03-12 by Pacific Turbine Parts (P&WC Service Agreement PA-2994)
- Cycles since overhaul: 47 (47 cycles since overhaul; near-zero)
- Full 8130-3 available upon shipment
- Core requirements: existing PTH must be returned within 30 days of receipt; core credit issued on inspection of returned core ($4,200 if serviceable; $0 if non-serviceable/scrap)

**Curtis verdict:**
47 cycles on the replacement part. N4421T's current PTH is at 10,402 accumulated. The replacement will have 47 cycles from the date of installation, against a new life limit of 12,500 cycles from overhaul. The aircraft will effectively reset from 2,098 remaining cycles to 12,453 remaining cycles at installation.

That math was better than a new part.

---

## §5. Procurement Decision and WO-RDG-003 Status Update

### §5.1 Purchase Order

**Decision:** Curtis authorized the purchase of the Pacific Turbine Parts overhauled PTH P/N 3053174.

**WO-RDG-003 status update (2026-08-10):**
- Status: OPEN → **PARTS ORDERED**
- Purchase order: PO-RDG-PTH-001 issued 2026-08-10
- Supplier: Pacific Turbine Parts (Burbank CA)
- Expected delivery: 2026-09-15 to 2026-09-22 (6–8 weeks from PO)
- Installation target: 2026-10-01 (next scheduled 200-hr inspection window for N4421T)

**Logged in Athelon WO-RDG-003 notes:**
> "PO issued to Pacific Turbine Parts. Rotable PTH P/N 3053174, overhauled 2026-03-12, 47 cycles since overhaul. 8130-3 will accompany shipment. Expected delivery mid-to-late September. Will coordinate installation with N4421T's 200-hr inspection scheduled for October. Installation at replacement window will be approximately 10,700–10,800 accumulated cycles on the existing housing (well within the 12,500 cycle limit). Marcus to review ALS counter update at installation."

---

### §5.2 ALS Board Status — N4421T PTH-01

**As of 2026-08-10:**
- ALS item: PTH-01 (Power Turbine Inlet Housing P/N 3053174)
- Status: **DUE_SOON** (no change — part is not yet replaced)
- Cycles remaining: ~2,050 (based on continued operations at ~180 cy/month since audit)
- WO associated: WO-RDG-003 (procurement phase — parts ordered)
- Procurement advisory status: **ACTIVE — PARTS ORDERED**
- Next ALS milestone: Installation (target 2026-10-01); ALS board PTH-01 counter reset at installation

**Dashboard display for Curtis (mobile and desktop):**
The ALS board for N4421T shows PTH-01 with the amber DUE_SOON badge and a linked procurement status indicator: `🔧 PARTS ORDERED — WO-RDG-003`. This is a new display state introduced by the F-1.4-E procurement tracking integration: a DUE_SOON item with an active associated WO shows the WO status inline on the ALS card, reducing DOM anxiety about items that are flagged but actively being managed.

---

## §6. Broader Platform Significance

### §6.1 The 12-Month Window

The most important number in WS33-B is not 2,153. It's twelve.

N4421T's Power Turbine Inlet Housing reached its procurement advisory threshold when it had 2,098 cycles remaining and approximately 11.7 months before its projected replacement window. The platform issued the advisory precisely when it was supposed to: at a moment when the shop had time to act. Not at 6 months, when the sourcing options narrow. Not at 3 months, when AOG pricing starts to look tempting. At twelve months, when the DOM has a full menu of choices.

Curtis Pallant made a good procurement decision because he had time to make it. He compared three suppliers. He got Marcus's compliance guidance on rotable parts. He chose the option with the best combination of lead time, cost, and compliance posture. He issued a purchase order and updated the work order in the same morning.

That is what the Procurement Lead Time Awareness feature is supposed to do. WS33-B is its first real-world proof case.

---

### §6.2 Marcus's Observation

Marcus sent a note to Nadia after reviewing the completed WO-RDG-003 on 2026-08-10:

*"OI-33-01 is running exactly right. Curtis had the advisory, he had the compliance guidance, he made the call. The platform didn't make the decision for him — it made sure he had the information twelve months in advance instead of four months in advance. That's the whole value proposition.*

*One observation for the v1.5 backlog: the F-1.4-E procurement advisory today is a notification. In v1.5 or v1.6, it could be a workflow — advisory → inquiry status → quotes logged → PO number entered → delivery tracking → installation date flagged. Curtis did all of that manually in the WO notes field. There's room to formalize it.*

*That's FR-33-01. Devraj has it."*

---

### §6.3 Devraj's Feature Note (FR-33-01)

**FR-33-01: Procurement Workflow Status Subfields**
- Requested by: Marcus Webb (compliance observation from OI-33-01)
- Context: WO-RDG-003 demonstrates that DOMs track procurement in WO free-text fields; formalizing the substates would make procurement progress machine-readable and reportable
- Proposed fields on a procurement-type work order: `inquiryStatus` (NOT_STARTED / IN_PROGRESS / QUOTES_RECEIVED), `poNumber`, `expectedDelivery`, `supplierName`, `8130-3Status`
- Compliance impact: MEDIUM — structured procurement tracking improves FSDO audit posture for life-limited part replacements (§145.221 records requirements)
- Effort: LOW — additive to existing WO schema
- **Status: ADDED TO v1.5 BACKLOG — ranked for Sprint 2**

---

## §7. Open Items and Forward Tracking

### §7.1 WO-RDG-003 Forward Status

| Date | Milestone | Status |
|---|---|---|
| 2026-08-10 | PO issued (PO-RDG-PTH-001) | ✅ DONE |
| 2026-09-15 to 2026-09-22 | Part delivery from Pacific Turbine Parts | ⬜ PENDING |
| 2026-09-22 | Receive and inspect rotable PTH; verify 8130-3; log in Athelon parts receiving | ⬜ PENDING |
| 2026-10-01 | N4421T 200-hr inspection + PTH replacement | ⬜ PENDING |
| 2026-10-01 | ALS board PTH-01 counter reset; Marcus compliance review of updated entry | ⬜ PENDING |
| 2026-10-01 | WO-RDG-003 close; N4421T returned to service | ⬜ PENDING |

### §7.2 N4421T ALS Board Forward State (at projected installation)

| Item | Cycles at Installation (est.) | New Remaining (post-installation) |
|---|---|---|
| Power Turbine Inlet Housing PTH-01 | ~10,800 accumulated (retired) | 12,453 cycles from overhaul (replacement part) |
| Other DUE_SOON items | None currently | N/A |
| All COMPLIANT items | Remain compliant | No change |

---

## §8. WS33-B Sign-Off

**Marcus Webb compliance sign-off:**
*OI-33-01 tracking confirmed complete for Phase 33 scope. Advisory issued at 12-month mark per F-1.4-E design. Procurement decision made by Curtis Pallant with full compliance guidance. Purchase order PO-RDG-PTH-001 issued 2026-08-10 for rotable PTH meeting P&WC overhaul standards. 8130-3 documentation confirmed available. ALS board PTH-01 remains DUE_SOON (correct — part not yet installed). Installation target 2026-10-01 at N4421T 200-hr inspection. Forward milestones logged in WO-RDG-003. OI-33-01 active tracking continues; closes at installation date.*

*Proof case confirmed: Procurement Lead Time Awareness feature (F-1.4-E) functioned as designed — advisory at 12 months, sufficient time for informed procurement decision. Curtis Pallant had eight sourcing options instead of one. That is the compliance value.*

**Signed: Marcus Webb, Compliance Architect, 2026-08-10**

**Cilla Oduya QA sign-off:**
*WS33-B operational tracking validates F-1.4-E advisory logic in production environment. Advisory triggered correctly at 12-month threshold. WO procurement tracking integration displays correctly on ALS board (WO-RDG-003 link visible on PTH-01 card). No platform defects observed in OI-33-01 tracking. FR-33-01 added to v1.5 backlog — procurement subfields will be covered in Sprint 2 QA scope.*

**Signed: Cilla Oduya, QA Lead, 2026-08-10**

---

*WS33-B complete. N4421T Power Turbine Inlet Housing DUE_SOON tracking: OI-33-01 active. Advisory issued 12 months before replacement window. Purchase order issued. Replacement target 2026-10-01. First real-world proof case for Procurement Lead Time Awareness feature (F-1.4-E). Platform performed.*
