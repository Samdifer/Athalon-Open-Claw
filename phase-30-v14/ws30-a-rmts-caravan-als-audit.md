# WS30-A — RMTS Caravan ALS Audit (N416AB, C208B, 2026-04-28)
**Aircraft:** N416AB (Cessna 208B Grand Caravan, S/N 208B0416, MSN 0416)
**Powerplant:** Pratt & Whitney Canada PT6A-114A, S/N PCE-54412
**Owner/Operator:** Crimson Mesa Aviation LLC, Grand Junction CO (Part 91)
**Maintaining shop:** Rocky Mountain Turbine Service (RMTS), KGJT
**Audit Lead:** Dale Renfrow (DOM, IA-CO-7742)
**Observers / Support:** Marcus Webb (Athelon compliance), Devraj Anand (Athelon data entry)
**Status:** ✅ DONE
**Date:** 2026-04-28
**Significance:** First turbine-type ALS entry in Athelon

---

## §1. Background and Setup

### §1.1 Why N416AB

N416AB is a 2009 Cessna 208B Grand Caravan operated by Crimson Mesa Aviation LLC under Part 91. It is the primary aircraft in RMTS's Caravan maintenance portfolio — Dale Renfrow has been the signing A&P-IA for this aircraft since 2018. WO-RMTS-001, RMTS's first work order in Athelon, was a 100-hour inspection on N416AB.

The other RMTS Caravans (N208MP, N208TZ) received historical AD compliance record entry in Phase 29 but have not yet received formal ALS board activation. All three Caravans share the same PT6A-114A engine type and substantially identical ALS profile. The Phase 30 audit strategy: fully audit N416AB as the template aircraft, then project the completed template onto N208MP and N208TZ with logbook-specific values.

Marcus committed this date — 2026-04-28 — to Dale Renfrow on 2026-04-14 during the pre-onboarding scoping call (WS29-A). RMTS-OI-01. This date does not move.

### §1.2 Pre-Audit Preparation

**Marcus (completed by 2026-04-25):**
- Reviewed Cessna 208B ICA (Doc No. D2137-1-13, latest revision) — Chapter 4 Airworthiness Limitations section, full LLP list with life limits
- Reviewed P&W Canada PT6A-114A ICA (PWEC Document 3021839 Rev 17) — engine component life limits (LLPs) and Certification Maintenance Requirements
- Cross-referenced against Cessna Type Certificate Data Sheet A37CE and Engine Type Certificate Data Sheet E4CE
- Prepared audit worksheet: 18 airframe ALS items + 11 PT6A-114A LLP/CMR items = 29 total audit line items
- Confirmed N416AB's N-number registration status (active, not lapsed) and airworthiness certificate status (Standard — Normal)

**Devraj (completed by 2026-04-25):**
- Cessna 208B ALS template entered into Athelon system (PR #181, merged 2026-04-24)
- PT6A-114A LLP/CMR items entered as engine-level ALS items (PR #182, merged 2026-04-25)
- N416AB aircraft record created in RMTS org; powerplant S/N PCE-54412 linked
- Template validation: Devraj confirmed Athelon's ALS item list matches Marcus's audit worksheet (29/29 items present)

**Dale (pre-audit, 2026-04-26):**
- Pulled N416AB airframe and engine logbooks from RMTS records storage
- Verified last major inspection date: 2025-11-14 (annual/Phase inspection, 11,847.2 hours TT)
- Noted since-last-inspection discrepancies in personal audit notes (two items flagged, shared with Marcus by email 2026-04-26)

---

## §2. Audit Session — 2026-04-28

**Location:** Rocky Mountain Turbine Service hangar, KGJT, Grand Junction CO
**Start time:** 08:00 MDT
**End time:** 14:35 MDT
**Attendees:** Dale Renfrow (audit lead), Marcus Webb (observer), Devraj Anand (data entry laptop)
**Aircraft TT at audit:** 12,047.3 hours

### §2.1 Session Opening

**Dale (opening the logbooks at 08:00):** "Okay. I've been waiting for this since April 14th. Let's start with the airframe — Cessna 208B ALS items — then move to the engine. I've got the logbooks organized in order. Devraj, you're entering as we go. Marcus, stop me if something doesn't look right."

**Marcus:** "That's exactly how we do it. You call the item, you read the numbers, I verify against the ICA references I have here, Devraj enters. If a number doesn't match what the ICA expects, we flag it before we move on. We don't skip flags."

**Dale:** "Agreed. Let's go."

---

## §3. Audit Results — Airframe ALS Items (Cessna 208B)

*Reference: Cessna 208B ICA Doc D2137-1-13, Chapter 4 Airworthiness Limitations. All limits are life limits in flight hours unless otherwise noted.*

| # | ALS Item Description | P/N | Life Limit | Hours Accumulated | Hours Remaining | Status |
|---|---|---|---|---|---|---|
| 1 | Propeller Shaft Flange | 9912361-7 | 30,000 hr | 12,047.3 | 17,952.7 | ✅ COMPLIANT |
| 2 | Primary Structure — Wing Rear Spar (fatigue) | 2614100-501 | 30,000 hr | 12,047.3 | 17,952.7 | ✅ COMPLIANT |
| 3 | Main Landing Gear Trunnion (cycles) | 0763524-5 | 25,000 cycles | 14,882 cycles | 10,118 cycles | ✅ COMPLIANT |
| 4 | Main Gear Drag Brace | 0763528-3 | 25,000 cycles | 14,882 cycles | 10,118 cycles | ✅ COMPLIANT |
| 5 | Nose Landing Gear Trunnion (cycles) | 0763539-4 | 20,000 cycles | 14,882 cycles | 5,118 cycles | ✅ COMPLIANT |
| 6 | Nose Gear Drag Brace | 0763543-2 | 20,000 cycles | 14,882 cycles | 5,118 cycles | ✅ COMPLIANT |
| 7 | Fuselage Aft Attachment Fitting — Horizontal Stab | 0763614-1 | 30,000 hr | 12,047.3 | 17,952.7 | ✅ COMPLIANT |
| 8 | Engine Mount Attach Fitting (forward, LH) | 9914272-7 | 22,000 hr | 12,047.3 | 9,952.7 | ✅ COMPLIANT |
| 9 | Engine Mount Attach Fitting (forward, RH) | 9914272-8 | 22,000 hr | 12,047.3 | 9,952.7 | ✅ COMPLIANT |
| 10 | Elevator Push-Pull Tube | 1213111-1 | 18,000 hr | **12,047.3** | **5,952.7** | ⚠️ DUE_SOON |
| 11 | Rudder Pedal Torque Tube | 1214081-2 | 15,000 hr | 12,047.3 | 2,952.7 | ⚠️ DUE_SOON |
| 12 | Aileron Bellcrank (inboard, each) | 1214093-3 | 18,000 hr | 12,047.3 | 5,952.7 | ✅ COMPLIANT |
| 13 | Wing Carry-Through Structure (fatigue) | 2614209-1 | 30,000 hr | 12,047.3 | 17,952.7 | ✅ COMPLIANT |
| 14 | Door Frame Stiffener — Cargo Door Upper | 0763731-6 | 20,000 cycles | 14,882 cycles | 5,118 cycles | ✅ COMPLIANT |
| 15 | Firewall Forward Bulkhead | 0763802-4 | 22,000 hr | 12,047.3 | 9,952.7 | ✅ COMPLIANT |
| 16 | Main Spar Lower Cap — BL 0.0 | 2614100-503 | 30,000 hr | 12,047.3 | 17,952.7 | ✅ COMPLIANT |
| 17 | Fuel Selector Valve (cycles) | 9924721-1 | 12,000 cycles | **11,840 cycles** | **160 cycles** | 🔴 OVERDUE_APPROACHING |
| 18 | Flap Motor Drive Gear (cycles) | 1262800-3 | 25,000 cycles | 14,882 cycles | 10,118 cycles | ✅ COMPLIANT |

---

## §4. Audit Results — PT6A-114A Engine LLP and CMR Items

*Reference: PWEC Document 3021839 Rev 17, PT6A-114A Maintenance Manual. Engine S/N PCE-54412. Engine TT: 9,847.3 hr. Engine TSOH: 4,321.4 hr (last overhaul: major turbine inspection, 2020-08-12, Gemini Turbine Services, KSLC).*

*Note: PT6A-114A is a free-turbine, reverse-flow turboprop. LLP tracking is by engine cycles (one cycle = one start through shutdown) except where noted as hours.*

| # | LLP / CMR Description | P/N | Life Limit | Cycles/Hours Accumulated | Cycles/Hours Remaining | Status |
|---|---|---|---|---|---|---|
| 19 | Compressor Impeller | 3025617-01 | 30,000 cycles | 18,420 cycles | 11,580 cycles | ✅ COMPLIANT |
| 20 | Compressor Turbine Disk (1st stage) | 3025618-02 | 30,000 cycles | 18,420 cycles | 11,580 cycles | ✅ COMPLIANT |
| 21 | Power Turbine Disk (1st stage) | 3025619-01 | 30,000 cycles | 18,420 cycles | 11,580 cycles | ✅ COMPLIANT |
| 22 | Power Turbine Disk (2nd stage) | 3025620-03 | 30,000 cycles | 18,420 cycles | 11,580 cycles | ✅ COMPLIANT |
| 23 | Power Turbine Shaft | 3025621-02 | 30,000 cycles | 18,420 cycles | 11,580 cycles | ✅ COMPLIANT |
| 24 | Gas Generator Turbine Disk (NGV assembly) | 3025622-01 | 25,000 cycles | 18,420 cycles | **6,580 cycles** | ⚠️ DUE_SOON |
| 25 | Compressor Turbine Blade Set | 3026144-01 | 10,000 hr TBO | 4,321.4 hr TSOH | 5,678.6 hr | ✅ COMPLIANT |
| 26 | Combustion Liner Assembly | 3026200-04 | 5,000 hr | **4,321.4 hr TSOH** | **678.6 hr** | ⚠️ DUE_SOON (FINDING F-3) |
| 27 | CMR-72-50-001: Fuel Manifold & Nozzle Flow Check | — | 500 hr interval | Last: 9,612.7 hr | Due: 10,112.7 hr | ✅ COMPLIANT |
| 28 | CMR-72-60-001: Power Turbine & Compressor Turbine Clearance Check | — | 1,000 hr interval | Last: 9,112.7 hr | Due: 10,112.7 hr | ✅ COMPLIANT |
| 29 | CMR-72-70-001: Torque Limiter Functional Check | — | 600 hr interval | Last: 9,712.7 hr | Due: 10,312.7 hr | ✅ COMPLIANT |

---

## §5. Audit Findings — Flagged Items

### Finding F-1: Rudder Pedal Torque Tube — 2,952.7 hours remaining (Item 11)

**Item:** Rudder Pedal Torque Tube, P/N 1214081-2
**Life limit:** 15,000 hours
**Hours accumulated:** 12,047.3 hours
**Hours remaining:** 2,952.7 hours
**Status:** ⚠️ DUE_SOON

**Significance:** 2,952.7 hours is within the DUE_SOON planning window (defined as less than 3,000 hours remaining or within 20% of life limit). This item is not approaching an immediate limit — at N416AB's typical utilization of approximately 700–800 flight hours per year, this component has roughly 3.5–4 years of life remaining. However, it is the first DUE_SOON alert on an airframe structural item for N416AB, and its proximity to the DUE_SOON threshold means it should be in the shop's planning horizon.

**Dale:** "I've been tracking this one manually. The torque tube replacement requires disassembly of the rudder pedal assembly, which we typically do in conjunction with a major inspection. I'd plan to address it at the next annual or Phase inspection. What I like is that Athelon now puts that number in front of me every time I open N416AB. I don't have to remember to check the spreadsheet."

**Action:** ALS board item set to DUE_SOON. Devraj added a planning note: "Coordinate replacement with next major inspection (est. 2027-Q4 per utilization trend)." No work order required immediately.

---

### Finding F-2: Fuel Selector Valve — 160 cycles remaining (Item 17)

**Item:** Fuel Selector Valve, P/N 9924721-1
**Life limit:** 12,000 cycles
**Cycles accumulated:** 11,840 cycles
**Cycles remaining:** 160 cycles
**Status:** 🔴 CRITICAL — immediate scheduling required

**Significance:** This is the audit's primary finding. Dale pre-flagged this item in his 2026-04-26 email to Marcus: *"I've got one cycle item I want to talk about — the fuel selector valve. I've been tracking it but I think the number is worse than I thought."*

The fuel selector valve cycle count came in at 11,840. The life limit is 12,000. That's 160 cycles remaining. At N416AB's typical utilization of approximately 2.8 cycles per day (Caravan charter operations often involve short segments), this component has roughly 57 operating days of remaining life from the audit date (2026-04-28). If Dale's tracking had remained on his spreadsheet alone, this item would have continued accumulating cycles with no automated alert.

**What the Athelon system provides:** The ALS entry triggered an immediate OVERDUE_APPROACHING alert (red, high-priority) on Dale's RMTS dashboard. The item appears at the top of the compliance sort — before DUE_SOON items, before all COMPLIANT items. A work order recommendation was generated automatically.

**Dale:** "There it is. There's the one. I knew it was close — that's why I flagged it in the email. But 160 cycles. That's tighter than I thought. I had '11,800' in my spreadsheet. But when I pulled the logbook just now, the actual number as of the last entry was 11,840. And we've flown it three times since I made that entry. So the real number might be 11,843 or 11,844. We need a work order for this today."

**Marcus:** "You're right. At 160 cycles, this is a near-term replacement. Not an AOG today, but not a 'schedule it when convenient' situation either. If you fly this aircraft for six more weeks without addressing it, you will either exceed the limit or be in an engineering analysis situation. Neither is where you want to be."

**Immediate action:** WO-RMTS-003 opened during the audit session, 2026-04-28, for fuel selector valve replacement (P/N 9924721-1, procure new). Dale contacted the aircraft owner (Crimson Mesa Aviation LLC, contact: Ray Escondido, Chief Pilot) by phone during a break in the audit session. Ray confirmed the aircraft is available for the replacement during 2026-05-05 through 2026-05-07. Hector Ruiz assigned as A&P performing the replacement.

**WO-RMTS-003 details:**
- Aircraft: N416AB (Cessna 208B)
- Task: Fuel Selector Valve replacement per Cessna 208B ICA / ALS item 9924721-1
- Scheduled: 2026-05-05 through 2026-05-07
- Parts on order: 2026-04-28 (Cessna Product Support, Grand Junction distributor)
- Expected delivery: 2026-05-03 (confirmed by Dale)

---

### Finding F-3: Combustion Liner Assembly — 678.6 hours remaining (Item 26)

**Item:** Combustion Liner Assembly, P/N 3026200-04
**Life limit:** 5,000 hours (from engine overhaul, per PWEC Document 3021839 Rev 17 §72-30-00)
**Hours since overhaul:** 4,321.4 hours
**Hours remaining to next planned overhaul:** 678.6 hours
**Status:** ⚠️ DUE_SOON

**Significance:** The combustion liner's 5,000-hour life limit runs from the last major turbine inspection (engine overhaul by Gemini Turbine Services, 2020-08-12). The engine will require another major inspection before 5,000 TSOH, which means the liner — along with other hot section components — should be in the planning horizon now.

**Marcus:** "This is an important one for Dale to understand the architecture of. The combustion liner isn't a part you replace in the field — it's replaced at major turbine inspection. So the '678.6 hours remaining' isn't '678 hours until you pull it and put in a new one at your hangar.' It's '678 hours until you need to have scheduled a major inspection appointment at an authorized turbine overhaul facility.' The lead time at a turbine shop right now is 8–12 weeks. That means Dale needs to make that call around the 600-hour mark — which is 78 hours from today."

**Dale:** "So the practical planning window opens in about 100 hours of operation, give or take."

**Marcus:** "Correct. At N416AB's utilization rate — call it 90–100 hours per month — that's approximately one month from today. I'd suggest Devraj add a planning note to this ALS item: 'Contact authorized turbine overhaul facility for major inspection scheduling no later than 5,878.6 engine hours (78 hours before overhaul limit).'"

**Action:** ALS board item set to DUE_SOON. Planning note added by Devraj: "Schedule major turbine inspection (Major Turbine Inspection required by 4,900 TSOH per PWEC planning guidance). Contact Gemini Turbine Services or equivalent P&W authorized facility. Target scheduling initiation: no later than engine TSOH 4,400 hr (~2026-06-01 at current utilization)." No immediate work order required; scheduling action triggered for ~2026-06-01.

---

## §6. N208MP and N208TZ ALS Board Activation

Following N416AB's audit completion (12:15 MDT), Devraj populated the N208MP and N208TZ ALS boards using the validated N416AB template with logbook-specific values for each aircraft.

**N208MP (engine PCE-54780, aircraft TT 11,209.4 hr at last entry, 2026-04-16):**
- ALS items populated: 29/29
- Items requiring attention: 0 (all COMPLIANT or within normal range)
- AD 2020-18-06 (combustion liner borescope, WO-RMTS-002) compliance reflected
- Marcus note: "N208MP's engine is newer — only 2,847 TSOH. No DUE_SOON engine items."

**N208TZ (engine PCE-52214, aircraft TT 9,118.3 hr at last entry, 2026-04-15):**
- ALS items populated: 29/29
- Items requiring attention: 0 (all COMPLIANT)
- Marcus note: "N208TZ is the youngest aircraft in the fleet. No planning items at this time."

All three Caravan ALS boards are live as of 2026-04-28, 14:00 MDT. RMTS-OI-01 is closed.

---

## §7. Athelon Value Assessment — Audit Session Observations

**Marcus (post-audit notes, 2026-04-28):** "The finding that matters for this writeup is item 17 — the fuel selector valve. Dale pre-flagged it, which means his spreadsheet-based tracking partially worked. But 'partially' is exactly the problem. His spreadsheet had 11,800 cycles; the logbook had 11,840; and the aircraft had flown three additional legs since the last logbook entry. The actual number was somewhere in the range of 11,843–11,847. The difference between 11,800 and 11,847 is 47 cycles — at 2.8 cycles per day, that's 16 days of operation that weren't captured. If the limit is 12,000 and you think you have 200 cycles remaining but you actually have 153, that gap could close faster than you expect.

"In Athelon, every logbook entry updates the cycle counter in real time. There is no 'last time I checked the spreadsheet' number. There is only the current number."

**Dale (post-audit):** "What I got today — beyond the three findings — is a complete picture of every ALS item on every Caravan I maintain. That's twelve thousand hours of history on N416AB, nine thousand on N208TZ, and everything in between on N208MP, and now all of it is in one place with the numbers I actually need to see. The combustion liner finding is a planning win. The fuel selector valve finding is a 'might-have-been' story. I caught it before I exceeded the limit. That's the game."

**Devraj (post-audit):** "First turbine-type ALS session complete. Template is live. The system handled the dual tracking mode — flight hours for airframe items, engine cycles for LLP items — correctly. Both tracking modes rendered correctly in the dashboard. No bugs encountered during live data entry. 29 items entered, 29 validated."

---

## §8. RMTS-OI-01 Closure

> **RMTS-OI-01 — CLOSED**
> Caravan ALS audit completed 2026-04-28. N416AB, N208MP, and N208TZ ALS boards live. Marcus Webb compliance sign-off recorded. Findings F-1, F-2, F-3 documented. WO-RMTS-003 opened for F-2 (fuel selector valve). RMTS-OI-01 is closed.
>
> — Marcus Webb, 2026-04-28, 14:35 MDT

---

## §9. Audit Summary

| Item | Result |
|---|---|
| Aircraft audited | N416AB (primary), N208MP and N208TZ (secondary) |
| Total ALS line items entered | 29 per aircraft (87 total across fleet) |
| Findings — CRITICAL (immediate scheduling) | 1 (F-2: fuel selector valve, 160 cycles remaining) |
| Findings — DUE_SOON (planning horizon) | 3 (F-1: rudder pedal torque tube; F-2 noted; F-3: combustion liner) |
| Work orders opened from audit | WO-RMTS-003 (F-2) |
| First turbine-type ALS entry in Athelon | ✅ CONFIRMED — 2026-04-28, 08:00 MDT |
| Marcus Webb compliance sign-off | ✅ SIGNED — 2026-04-28, 14:35 MDT |
| RMTS-OI-01 | ✅ CLOSED |

---

*WS30-A is complete. The Cessna 208B ALS template is live. Rocky Mountain Turbine Service has a fully active fleet compliance board for all three Caravans. The fuel selector valve finding on N416AB — 160 cycles to limit — is the audit's headline. It was caught. A work order was opened. Dale Renfrow had the number he needed before it became a regulatory event.*
