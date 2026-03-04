# WS33-A — High Plains Aero & Charter: Qualification + Onboarding
**Workstream:** WS33-A
**Phase:** 33 / v1.5
**Owner:** Nadia Solis (lead), Marcus Webb (compliance gap assessment)
**Supporting cast:** Lorena Vásquez (DOM/IA, HPAC), Derek Sousa (co-owner/accountable manager)
**Timeline:** 2026-07-16 through 2026-08-04
**Status:** ✅ DONE — QUALIFIED (unconditional; onboarding scope filed)

---

## §1. Context and Significance

Seven shops. Four versions. Fourteen dispatches. Athelon's first seven customers arrived through a network of warm referrals and careful outbound work — Nadia or Marcus knowing someone who knew someone, a conversation at Sun 'n Fun, a PAMA regional meeting, a FSDO examiner who mentioned a "compliance system" that a Grand Junction turbine shop was using. The relationships came before the platform.

Lorena Vásquez did not come through a warm referral. She came through a website contact form, on a Tuesday morning in early June, with a note that made everyone stop:

> *"Interested in turbine ALS tracking. Not interested in another platform that doesn't understand what a CMR is."*

Marcus Webb read the note on his laptop in the middle of a meeting. He wrote three words in his notebook and showed it to Nadia after the call ended: *She's done the reading.*

What that note said, to anyone who understood the regulatory landscape, was not just that Lorena Vásquez had a turbine operation. It said she knew that Continued Airworthiness Requirements (CMRs) were not the same as Airworthiness Directives. That most software platforms confused them, or collapsed them into a single compliance bucket, or simply omitted the distinction. That she'd shopped before. That she'd been disappointed before. That she was giving Athelon a single shot to prove it was different.

This document records the qualification process for High Plains Aero & Charter (HPAC) — the 8th shop on Athelon, the first in southern Colorado, the first King Air B200 operator, and the first Part 145 + Part 135 dual-cert shop in the network. It covers: Marcus's pre-assessment, Nadia's discovery call, the qualification decision, and the pre-onboarding gap brief delivered to Lorena.

---

## §2. Marcus Pre-Assessment (2026-07-14, prior to discovery call)

Marcus Webb completed the dual-cert pre-assessment two days before Nadia's discovery call. The assessment reviewed what Athelon's current platform surface addressed for a combined Part 145 / Part 135 shop, and where the gaps were.

**Pre-Assessment Document: HPAC-PRE-001**
**Date:** 2026-07-14
**Author:** Marcus Webb
**Subject:** Athelon Compliance Surface Assessment — Part 145 + Part 135 Dual-Cert Profile (HPAC Lorena Vásquez)

---

### §2.1 What Athelon Does Today for a Part 145 Shop

Athelon's v1.4.0 feature set was built around Part 145 repair station compliance needs. The following capabilities are fully operational:

| Capability | Notes |
|---|---|
| Work order lifecycle (open → in progress → pre-close → RTS) | Per §145.211 work order requirement |
| IA sign-off and re-auth (F-1.1-B, AC 120-78B compliant) | Per §145.155 qualified personnel requirements |
| Airworthiness Limitations Section (ALS) tracking | Part 145 §145.205 maintenance release + ALS |
| Repetitive AD interval tracking (F-1.4-A) | Per §145.215 airworthiness responsibility |
| ALS compliance dashboard (F-1.4-B) | Fleet-level ALS status for DOM review |
| Part inventory and 8130-3 traceability | Per §145.221 records requirements |
| FSDO Audit Export v1.3 (F-1.3-D) | Partial — see gap §2.3 |
| Repair station certificate number on maintenance releases (F-1.4-D) | Per §145.55 certificate display requirements |
| Certificated personnel compliance alerts (F-1.4-C qualification cert tracking) | Personnel certs, expiry alerts |
| Maintenance procedures / approved data reference (F-1.4-E) | Data reference linking |
| Procurement lead time awareness (F-1.4-E) | DUE_SOON procurement advisory |
| Maintenance event clustering (F-1.4-F) | Event co-scheduling tool |

**Summary:** Athelon's Part 145 surface is mature and battle-tested across seven shops. Lorena's repair station maintenance workflow will be fully supported on Day 1.

---

### §2.2 What Athelon Does Today for a Part 135 Shop

Athelon's Part 135 support was added in v1.2 (Phase 23) for Priya Sharma's SPEA Air operation and has been incrementally improved. Current state:

| Capability | Notes |
|---|---|
| Pilot Notification Log (§135.65) | Basic log filed by DOM/coordinator |
| MEL integration (minimum equipment list tracking) | MVP implementation; Priya UAT confirmed usable |
| Certificate holder separation (org-level cert config) | Multi-org architecture supports cert holder separation |
| Part 135 ops spec references on work orders | Field available; not enforced |

**What Athelon does NOT yet do for Part 135:**
| Gap | Severity | Resolution Path |
|---|---|---|
| Part 135 ops spec compliance workflow | HIGH — Lorena's charter operation requires documented ops spec cross-reference for each aircraft release | v1.5 backlog: Part 135 Deeper Integration (#4 in v1.5 priority list) |
| DOM / Director of Operations separation (§135.71) | MEDIUM — DO/DOM roles are sometimes split in larger 135 ops; Athelon currently treats DOM as combined role | Not yet in v1.5 sprint plan; addressable via role config |
| Pilot qualification record integration | MEDIUM — Priya's small shop manages pilot quals manually; Lorena's charter operation may need more | Part 135 Deeper Integration scope |
| Part 135 MEL item tracking with RTS gate | MEDIUM — Current MEL tracking logs items but does not gate work order closure on open MEL items | Part 135 Deeper Integration scope |

**Assessment:** The Part 135 gaps are real but they are known. They were identified in Phase 32 during the v1.5 scoping session. The Part 135 Deeper Integration item is in the v1.5 backlog. What matters for Phase 33 onboarding is: are the gaps in the Part 135 surface so severe that Lorena cannot get value from Athelon on Day 1? Answer: no. The Part 145 side is complete. The Part 135 side is functional at the Priya Sharma level. What's missing is the full ops spec integration that a growing charter operation eventually wants. That is a growth gap, not a Day 1 blocker.

**Conclusion:** Lorena can onboard in Phase 33 and get full value from the Part 145 compliance surface immediately. The Part 135 deeper integration gap should be disclosed to Lorena in the pre-onboarding brief, along with a clear timeline for when the v1.5 Part 135 sprint work is planned.

---

### §2.3 King Air B200 / PT6A-42 — ALS Surface

This is the technical prerequisite for HPAC onboarding. As of 2026-07-14:

- **PT6A-42 ALS table:** NOT YET IN ATHELON. WS33-C (King Air B200 / PT6A-42 ALS expansion) is the Phase 33 parallel workstream that builds this.
- **Status:** WS33-C audit is underway (Marcus conducting source document research concurrently with this pre-assessment). Timeline: template complete by 2026-08-08.
- **Gap:** Lorena cannot enter King Air B200 ALS data until the PT6A-42 template is built. This is a known, scheduled gap.
- **Mitigation:** The gap does not block onboarding qualification. Lorena can begin the onboarding process, enter piston fleet data, and activate the King Air B200 ALS boards once the template is ready (estimated 2026-08-08). For the two PT6A-42 aircraft, Lorena's current log card system remains active in parallel until the Athelon template is complete.

---

### §2.4 Pre-Assessment Summary

**HPAC qualification posture: GO — recommend proceeding to discovery call.**

Lorena's shop is the most complex profile Athelon has onboarded. The dual-cert structure, the King Air B200 ALS density (estimated 50 items per aircraft), and the Part 135 ops spec surface together make this the hardest onboarding yet. But none of the gaps are invisible. They are known, documented, and on a resolution path in v1.5.

The honest brief to Lorena: here is what works today, here is what we're building, here is when you'll have it.

**Signed: Marcus Webb, Compliance Architect, 2026-07-14**

---

## §3. Nadia's Discovery Call (2026-07-16)

**Call date:** 2026-07-16, 10:00 AM MT
**Duration:** 58 minutes
**Participants:** Nadia Solis (Athelon), Lorena Vásquez (DOM/IA, HPAC), Derek Sousa (co-owner, HPAC)
**Call notes by:** Nadia Solis

---

### §3.1 Pre-Call Setup

Nadia read Marcus's pre-assessment the morning of the call. She'd also pulled the HPAC Part 145 certificate (HPAC-145-0044) from the FAA registry — current, no open enforcement actions, no open airworthiness concerns from the Denver FSDO. Clean.

She'd also looked up the Denver FSDO's public audit history for Part 145 certificated shops in the Colorado region. High Plains Aero had one inspection in the past three years — a routine surveillance inspection in 2024. No findings. The inspector's summary (available via FOIA request, which Marcus had made as part of the prospect assessment) noted: *"Repair station records in excellent order. DOM has thorough knowledge of regulatory requirements."*

Marcus's note from the contact form: *She's done the reading.*

The FSDO inspection: *Thorough knowledge of regulatory requirements.*

Nadia went into the call knowing this DOM had a clean shop, a clear regulatory view, and a very specific reason for reaching out. She would not pitch. She would listen.

---

### §3.2 Call Transcript (Condensed)

**Opening — Lorena:**

"I'll start with what I said on the form, since it apparently got Marcus's attention. Most compliance software I've looked at treats ALS items and AD compliance as the same problem. They're not. An AD is a mandatory action — you comply, you record, you move on. A CMR is a continued airworthiness requirement with an interval — it's recurring, it tracks against operating hours or cycles, and if you miss the interval it's not just an AD violation, it's a continued airworthiness gap under Part 33 certification basis. I've been running PT6A-42 engines for five years. I've never found a platform that handles that distinction correctly."

**Nadia:**

"That's exactly why Marcus wrote down 'she's done the reading.' Can you walk me through what your current tracking system looks like for the King Air?"

**Lorena:**

"Two spreadsheets, two loose-leaf binders, and approximately three hundred sticky notes. One spreadsheet per engine. Each sheet has all fourteen LLP items with current cycle counts and life limits. The six CMR items per engine are in the binder with the actual P&WC EMM section for each one — I keep a printed copy because I want the interval basis right there when I'm signing off. When we do a flight, Derek enters the cycles in the spreadsheet that night. We've been doing this for five years. It works. But it doesn't scale."

**Nadia:**

"You have two King Airs, so that's eighty ALS items total."

**Lorena:**

"Eighty engine items. Plus the airframe ALS — there are structural fatigue limits, actuator cycle limits, landing gear life limits in the Beechcraft maintenance manual. I estimate another eight to twelve items per aircraft. So closer to a hundred items across the fleet."

**Marcus (listening, notes only, not on call):** *She already knows the count. She's done the source document review herself.*

**Nadia:**

"How do you manage the Part 135 ops spec side? The charter release workflow?"

**Lorena:**

"Manually. We have a pre-departure checklist that cross-references our ops spec. Derek runs it every dispatch. It works, but it's not integrated with maintenance — we rely on me knowing that a given aircraft is both airworthy and in spec before Derek dispatches it. For a two-aircraft charter fleet, that's manageable. If we grow to four aircraft, it gets harder."

**Nadia:**

"I want to be honest with you about where we are on that. Marcus flagged it in his pre-assessment."

**Lorena:**

"Go ahead."

**Nadia:**

"The Part 145 maintenance side is solid — we've been building it for four versions and seven shops. But the Part 135 ops spec integration, the kind of thing that ties maintenance release to dispatch authorization — that's in our backlog. It's a v1.5 priority. We're building it, but I can't give you a firm date because the sprint hasn't started yet. If you come on in Phase 33, you get full Part 145 value on Day 1. The Part 135 depth comes with v1.5."

**Lorena (pause, then):**

"That's the most honest thing any software company has said to me in five years of shopping. What's the timeline on the King Air ALS template?"

**Nadia:**

"Marcus is building it now. We have a formal ALS audit protocol — he's done it for the Robinson R44, Bell 206B-III, Sikorsky S-76C, Cessna 208B, and the TBM 850 PT6A-66D. He starts from the TCDS, the ICA, and the EMM. The PT6A-42 audit is estimated complete by early August."

**Lorena:**

"I want to be your field validator on that. I've been living with that engine for five years. I'll review the seed data against both aircraft's logs."

**Nadia (suppressing a smile):**

"Marcus will want that."

**Derek Sousa (first substantive comment of the call):**

"One question from the business side. We have nine certificated personnel. How does Athelon handle a shop our size — are we a large customer for you or a small one?"

**Nadia:**

"You're our eighth. We have seven active shops right now. You'd be the most complex profile we've onboarded. That means we're going to be careful, and there may be a week or two where we're building something specifically for your shape. But you're not too big — you're exactly the kind of shop we built v1.5 to reach."

**Derek:**

"Fair."

---

### §3.3 Key Call Outcomes

| Item | Outcome |
|---|---|
| Current ALS tracking method | Two spreadsheets + log binder system; functional, non-scalable |
| FSDO audit posture | Denver FSDO; last inspection 2024, no findings; DOM confident in current compliance posture |
| PT6A-42 log card workflow | 20 items per engine (14 LLP + 6 CMR); Lorena manages manually; cycle updates daily |
| Part 135 ops spec workflow | Manual pre-departure checklist; not integrated with maintenance records |
| Urgency / timeline | Motivated to onboard before the 2026 fall charter season picks up (October/November) |
| Lorena's offer | Willing to serve as field validator for PT6A-42 ALS seed data review |
| Derek's concern | Org scale fit — resolved in call |
| One stated reservation | Part 135 ops spec integration not yet available — accepted with full disclosure |

---

## §4. Qualification Assessment (2026-07-18)

**Meeting:** Nadia + Marcus + Devraj, 2026-07-18, 60 minutes
**Subject:** HPAC Qualification Assessment (post-discovery call)

**Assessment framework:**

| Factor | Assessment |
|---|---|
| Does Lorena's urgency match Phase 33 timing? | YES — she wants to onboard before October; King Air ALS template completes ~2026-08-08; onboarding timeline is achievable |
| Are the compliance gaps addressable before onboarding begins? | YES — Part 145 gaps: none. Part 135 gap: disclosed, accepted, scheduled for v1.5 sprint. King Air ALS template: in-flight in WS33-C |
| Is the PT6A-42 ALS audit achievable in Phase 33 scope? | YES — Marcus estimates 3-week audit + seed data build; Lorena has offered field validation; template by 2026-08-08 |
| Is Derek Sousa's involvement compatible with DOM-primary model? | YES — Derek manages business side; Lorena is sole DOM/IA; onboarding is DOM-primary |
| Complexity fit (does the team have bandwidth)? | YES — WS33-C provides direct support to WS33-A; Marcus + Devraj both allocated |

**Decision:** **QUALIFIED — proceed to Phase 33 onboarding scope.**

---

## §5. Pre-Onboarding Gap Brief to Lorena (2026-07-22)

**Delivered:** 2026-07-22
**Method:** Video call + written document (HPAC-GAP-BRIEF-001) emailed after call
**Participants:** Marcus Webb + Nadia Solis (Athelon); Lorena Vásquez + Derek Sousa (HPAC)

**Document: HPAC-GAP-BRIEF-001**

---

### What Athelon Does for High Plains Aero Today

**Full coverage:**
- Work order lifecycle: open → in-progress → pre-close → RTS. Compliant with §145.211.
- IA sign-off and re-auth workflow. AC 120-78B compliant. Lorena's IA (IA-CO-7745) will be entered as the primary signing IA.
- Part 145 repair station certificate (HPAC-145-0044) displayed on all maintenance releases.
- ALS tracking: **as soon as the King Air B200 / PT6A-42 template is complete (~2026-08-08)**, Lorena can enter actual cycle counts for N521HPA and N408HPA and activate both ALS boards.
- Piston fleet ALS: the Cessna 421 (GTSIO-520-L) and Navajo (TIO-540-A2C) have piston ALS profiles that are already in the Athelon template library. These can be entered on Day 1.
- Training aircraft (N18116, N52284): Part 91 profiles; basic maintenance records only; no ALS requirements.
- FSDO Audit Export: current v1.3 export covers work orders, ALS board snapshot, repetitive AD compliance. Export will include HPAC-145-0044 on the cover page.

**Functional (with limits):**
- Part 135 Pilot Notification Log (§135.65): available. Lorena's two King Air B200s (N521HPA, N408HPA) and Cessna 421 (N3382P) are the charter aircraft; logs track per-aircraft.
- MEL tracking: MVP level — items can be logged; not gated to work order closure.
- Part 135 ops spec cross-reference: field available on work orders; not enforced by workflow logic.

---

### What Athelon Does Not Yet Do (Honest Gaps)

| Gap | Impact for HPAC | Timeline |
|---|---|---|
| Part 135 ops spec integration (§135.71 airworthiness release cross-reference) | Lorena's charter dispatch workflow is not yet integrated with maintenance release in the platform | v1.5 Part 135 Deeper Integration sprint — target Sprint 3 or 4 (approximately 2026-Q4) |
| DOM / Director of Operations role split | Not relevant to current HPAC structure (Lorena is DOM; Derek is accountable manager only) | Not blocking |
| Pilot qualification record integration | Not currently in Athelon | v1.5 Part 135 Deeper Integration scope |
| MEL gate on work order closure | MEL items can be logged but do not block RTS sign-off | v1.5 Part 135 Deeper Integration scope |

**Marcus's note to Lorena:**

*"Every gap above is in the v1.5 backlog. The Part 145 surface is complete and you'll use it from Day 1. The Part 135 depth is real, and the honest answer is we're building it. You're coming on at a moment in the program where the platform has the depth you care about — the ALS distinction, the CMR interval tracking, the IA workflow — and you're joining in time to help shape what Part 135 looks like in v1.5. That's not a pitch. It's the situation."*

**Signed: Marcus Webb, Compliance Architect, 2026-07-22**

---

## §6. Pre-Onboarding Call — Marcus and Lorena (2026-07-22, 90 minutes)

This call was the moment the file had been building toward.

Marcus runs the gap brief calls. He schedules them the same way every time: video call, screen share of the gap document, no slides, no pitch. He reads through the document with the shop, section by section, and fields questions. For most shops, the call takes thirty minutes. There are a few questions about terminology, a few confirmations that the limitations described are acceptable, and a handshake.

The call with Lorena took ninety minutes. Not because the gaps were worse — they weren't. It was because Lorena had questions.

---

**On the ALS template:**

"I've reviewed the PT6A-42 EMM section 05-10. You said fourteen LLP items — I count fifteen if you include the Hot Section Inspection item that P&WC added in SB21792. Is that in your seed data?"

Marcus opened the WS33-C audit draft on his second screen.

"Not yet. It's flagged as a service bulletin applicability question — SB21792 is optional on some serial number ranges. Can you tell me if it's applicable to your engine serial numbers?"

"I'll send you the ESN and the modification status. If it's applicable, it needs to be in the table."

*She knows the SB number. She has the EMM memorized.*

---

**On the CMR distinction:**

"The reason I asked about CMRs in the contact form was because I've seen platforms call them 'special recurring ADs.' They're not. They're a continued airworthiness obligation embedded in the TC certification basis. The interval basis is different. The tracking basis is different. If the FSDO inspector asks me to demonstrate CMR compliance and I show them an AD list, that's not good enough."

"The CMR items in the Athelon ALS table are flagged by type," Marcus said. "The audit schema distinguishes `LLP` from `CMR`. On the ALS board, CMR items have a different badge — amber `CMR` label versus gray `LLP`. The tracking logic for both is interval-based against operating hours or cycles, but they display differently and they have separate export sections in the FSDO bundle."

"Show me."

Marcus pulled up the WS32-B N4421T ALS board — the TBM 850 PT6A-66D data from Curtis Pallant's aircraft. He walked Lorena through the CMR item display, the interval tracking, the DUE_SOON advisory at ninety days.

"Okay," she said. "That's the right architecture."

---

**On the FSDO Export:**

"The v1.5 export improvements — Marcus mentioned in his memo that the personnel cert section is being added. When is that shipping?"

"Sprint 1 of v1.5 — WS33-C parallel track. Should be live by mid-August."

"Good. The Denver FSDO always asks for the IA certs when they audit. If the export doesn't have them, I'm printing them separately. It would be better to have them in the bundle."

"Agreed. That's exactly why the feature is in Sprint 1."

---

**The close:**

At minute eighty-five, Lorena was quiet for a moment. Marcus had learned, from seven shops, that silence at the end of a gap brief call usually meant one of two things: they were about to ask for a price concession, or they were about to say yes.

"I'm going to send you the ESN data for both aircraft," she said. "And the SB21792 modification status. I want to review your seed data before it goes into the system."

"That's the plan."

"And I want to be notified when the FSDO export update is live. Not in a newsletter — directly."

"I'll add you to the feature notification list."

"Then I'm in." A pause. "Derek, you heard all of that."

"I heard it." Derek Sousa's voice from off-camera. "She's been looking for this for five years. Let's do it."

---

## §7. Onboarding Scope Document (2026-07-24)

**Document:** HPAC-SCOPE-001
**Status:** SIGNED (Lorena Vásquez, Derek Sousa — 2026-07-25; Nadia Solis — 2026-07-25)

### Scope Boundaries

**In scope for Phase 33 onboarding:**

1. Part 145 repair station workflow (HPAC-145-0044)
   - Work order lifecycle (all aircraft)
   - IA sign-off (Lorena Vásquez, IA-CO-7745)
   - Maintenance records and RTS entries
   - Part inventory and 8130-3 traceability
   - FSDO Audit Export (v1.3 baseline; v1.5 improvements expected 2026-08-11)

2. ALS tracking
   - Cessna 421 (N3382P, GTSIO-520-L): piston ALS profile — activate Day 1
   - Navajo (N8014R, TIO-540-A2C): piston ALS profile — activate Day 1
   - Training aircraft (N18116, N52284): basic maintenance records, no ALS
   - King Air B200 (N521HPA, N408HPA): PT6A-42 + airframe ALS template — activate when WS33-C template complete (~2026-08-08)

3. Personnel records
   - 9 certificated personnel entered (Lorena + Derek + 7 mechanics/inspectors)
   - IA cert (IA-CO-7745) uploaded; expiry alert configured
   - A&P cert numbers entered for all certificated mechanics

4. Part 135 basic compliance
   - Pilot Notification Log (§135.65) configured for N521HPA, N408HPA, N3382P
   - MEL tracking (MVP level) for charter aircraft
   - Part 135 cert number (HPAC-135-CO-0044) in org profile

**Not in scope for Phase 33 (deferred to v1.5 Part 135 sprint):**
- Part 135 ops spec integration with maintenance release
- Pilot qualification record integration
- MEL gate on work order closure

**Onboarding start date:** 2026-07-28 (data entry session with Lorena)

---

## §8. Day 1 Data Entry Session (2026-07-28)

**Session lead:** Nadia Solis (remote)
**On-site:** Lorena Vásquez (KPUB, High Plains Aero & Charter hangar)
**Duration:** 4.5 hours (10:00 AM MT – 2:30 PM MT)

---

### §8.1 Fleet Entry

| Aircraft | Entry Status | Notes |
|---|---|---|
| N521HPA (King Air B200) | Partial — aircraft entered; ALS board pending template | Engine serial numbers logged; modification status submitted to Marcus for WS33-C |
| N408HPA (King Air B200) | Partial — aircraft entered; ALS board pending template | Engine serial numbers logged |
| N3382P (Cessna 421) | Complete — ALS board ACTIVE (18 items entered; 2 DUE_SOON) | GTSIO-520-L template applied; Lorena reviewed and confirmed each item |
| N18116 (Cessna 172S) | Complete — maintenance records profile | Part 91; no ALS |
| N52284 (Cessna 182T) | Complete — maintenance records profile | Part 91; no ALS |
| N8014R (Navajo Chieftain) | Complete — ALS board ACTIVE (12 items entered; all COMPLIANT) | TIO-540-A2C template applied |

**ALS items activated Day 1:** 30 items across 2 piston aircraft (N3382P + N8014R)
**ALS items pending:** ~100 items (N521HPA + N408HPA; pending King Air B200 template)

---

### §8.2 First Real Observation

At 1:15 PM, while Lorena was entering the Cessna 421 ALS data, the system surfaced a DUE_SOON advisory on the N3382P GTSIO-520-L LEFT engine: *Magneto Timing Check, 1,350 cycles; limit 1,400; 50 cycles remaining.*

Lorena looked at the screen.

"That's in my spreadsheet. I knew about that." She pulled up her laptop and checked. "I have it flagged for the next 50-hour. But it's the other one I want you to look at — I have the right engine magneto at 1,390 cycles. That's only ten cycles from the limit."

She navigated to the second engine entry. The DUE_SOON advisory was already there. The system had found both.

"Your spreadsheet only has one flagged?"

"I have a sticky note on the right engine. But it's not in the formal tracking column." A pause. "That's why I'm here."

---

### §8.3 Personnel Entry

All 9 certificated personnel entered:
- Lorena Vásquez (IA-CO-7745 — cert uploaded; expiry alert: not required for IA, but alert configured for Denver FSDO annual inspection cycle)
- Derek Sousa (A&P, non-signing)
- 7 mechanics (A&P certs entered; 2 with repairman certificates also entered)

**Part 145 cert configured:** HPAC-145-0044
**Part 135 cert configured:** HPAC-135-CO-0044

---

### §8.4 First Work Order

Lorena opened the first work order before the session ended.

**WO-HPAC-001**
- **Aircraft:** N3382P (Cessna 421)
- **Type:** Unscheduled — right engine magneto check (DUE_SOON ALS advisory triggered)
- **Opened:** 2026-07-28
- **Assigned:** Lorena Vásquez (IA) + Raul Montoya (A&P, lead mechanic)
- **Status:** OPEN

"I'm going to close this before the end of the week," Lorena said. "The right magneto's within ten cycles. We shouldn't wait."

Nadia logged WO-HPAC-001 in the session notes.

The 8th shop was live.

---

## §9. King Air B200 ALS Activation (2026-08-08)

**Date:** 2026-08-08
**Context:** WS33-C King Air B200 / PT6A-42 ALS template complete; Lorena confirmed as field validator.

Marcus sent the PT6A-42 seed data table to Lorena at 9:00 AM on 2026-08-08 for field validation. The table contained:
- 14 LLP items per engine (including the SB21792 Hot Section Inspection item — Marcus confirmed applicable to both aircraft's engine serial numbers)
- 6 CMR items per engine
- 10 King Air B200 airframe ALS items (from Beechcraft MM §05-10)

Lorena's field validation took six hours. She sat in the hangar with the actual logbooks for N521HPA spread across a worktable and compared every row.

She found three discrepancies:
1. **N521HPA, Engine 1 (S/N PCE-RB0742):** Power Turbine Stator, seed data showed 7,200 cycles life limit; actual engine log showed this engine's stator had been replaced at 4,891 cycles under SB1837 — the replacement stator has a 3,600 cycle life from the replacement date. Current remaining: 1,847 cycles. **CRITICAL — seed data was wrong for this specific engine configuration.**
2. **N521HPA, Engine 2 (S/N PCE-RB0901):** Compressor Disc, seed data showed 13,200 cycles; actual logbook showed 11,847 accumulated. **No error — but flag: 1,353 cycles to limit; DUE_SOON in the 18-month range.**
3. **N408HPA:** All items confirmed against logbooks. No discrepancies.

Lorena called Marcus directly.

"The Power Turbine Stator on N521HPA engine one. The seed data has the wrong life limit. The stator was replaced under a service bulletin — the replacement part has a different life. You need to know this before you enter it."

Marcus pulled up the audit notes. SB1837 was in the source document list, noted as *optional service bulletin affecting select serial number ranges.* He had flagged it as conditionally applicable pending ESN review. The field validation had caught what the generic audit would have missed.

"That's why you're the validator," he said.

"That's why you need a validator who has the actual logbooks in front of them," she said. "That's not a criticism. That's the constraint of building a generic template."

By 4:30 PM, both corrections were incorporated. The King Air B200 template was finalized. Devraj activated both aircraft's ALS boards in the system.

**N521HPA ALS board: ACTIVE (52 items — 24 engine LLP + 12 engine CMR + 10 airframe + adjusted Power Turbine Stator)**
**N408HPA ALS board: ACTIVE (50 items — 28 engine LLP + 12 engine CMR + 10 airframe)**

**Critical advisory surfaced immediately:** N521HPA Engine 1 Power Turbine Stator — 1,847 cycles remaining. Lorena needs to begin procurement planning. Marcus flagged for an OI (OI-33-02).

---

## §10. Qualification Summary and Sign-Off

**Qualification status:** QUALIFIED — UNCONDITIONAL
**Onboarding status:** COMPLETE (as of 2026-08-08)
**Fleet status:** All 6 aircraft active in Athelon. Two King Air B200s fully on ALS boards.
**Personnel:** 9 certificated personnel in system.
**Work orders:** 2 open (WO-HPAC-001 — N3382P magneto check; WO-HPAC-002 — N521HPA Engine 1 Power Turbine Stator procurement initiated)

**Lorena's note to Nadia (2026-08-08, 6:00 PM MT):**

*"ALS board is live. The Stator finding was already in my log — I knew it needed attention. Now it's in the system and Derek can see it too. That matters more than I expected."*

**Marcus Webb compliance sign-off:**
*All Part 145 compliance surfaces validated. HPAC-145-0044 active in system. Lorena Vásquez IA cert confirmed. King Air B200 / PT6A-42 ALS seed data field-validated against actual aircraft logbooks. All findings resolved. Three critical discrepancies identified and corrected during field validation — field validation protocol proven essential for aircraft with service-bulletin-modified configurations. WS33-A COMPLETE.*

**Signed: Marcus Webb, Compliance Architect, 2026-08-08**

**Nadia Solis program note:**
*Seven shops through outbound work, warm referrals, and careful relationship-building. The 8th shop found us. That's a different kind of signal. Lorena spent five years looking for a platform that understood the regulatory structure. Marcus's audit protocol and the CMR/LLP distinction architecture she'd been looking for — that's what brought her in. Not a sales call. The product's reputation.*

**Cilla Oduya QA sign-off:**
*WS33-A — all platform functionality used in onboarding validated in prior phase QA cycles. No new features introduced in WS33-A. ALS board activation for King Air B200 / PT6A-42 covered under WS33-C QA scope (see WS33-C artifact). WS33-A onboarding APPROVED.*

**Signed: Cilla Oduya, QA Lead, 2026-08-08**

---

## §11. Open Items Surfaced in WS33-A

| OI | Description | Owner | Status |
|---|---|---|---|
| OI-33-02 | N521HPA Engine 1 Power Turbine Stator — 1,847 cycles remaining; procurement advisory; replacement window ~2028-01 | Marcus + Lorena | OPEN — procurement planning initiated |
| OI-33-03 | N3382P RIGHT engine magneto check (WO-HPAC-001) — 10 cycles to limit | Lorena + Raul Montoya | OPEN — WO in progress |

---

*WS33-A complete. High Plains Aero & Charter — 8th shop on Athelon. Pueblo, Colorado. King Air B200. Part 145 + Part 135. Lorena Vásquez, DOM/IA. She came looking for a platform that understood a CMR. She found one.*
