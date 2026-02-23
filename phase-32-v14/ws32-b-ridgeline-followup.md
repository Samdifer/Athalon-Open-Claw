# WS32-B — Ridgeline Air Maintenance Follow-Up
**Open Items Addressed:** OI-32-01 (N88KV fuel selector valve physical inspection), OI-32-02 (N4421T TBM 850 PT6A-66D ALS full audit)
**Compliance Urgency:** HIGHEST (OI-32-01 is pre-flight safety-critical; physical part status unverified)
**Status:** ✅ DONE
**Date range:** 2026-06-17 through 2026-06-23

---

## §1. Background

During the Ridgeline Air Maintenance onboarding (WS31-A, 2026-05-16), the N88KV Cessna 208B ALS data entry session revealed a 314-cycle discrepancy between the paper maintenance card (10,800 cycles) and the actual logbook count (11,114 cycles) for the fuel selector valve (P/N 9924721-1, Cessna 208B ALS item, life limit: 12,000 cycles per Cessna Service Bulletin D2101-13 §5-10-15).

The card was corrected in Athelon on 2026-05-16. The correct cycle count — 11,114 — was entered in the ALS board, placing the valve at 886 cycles remaining (COMPLIANT, approaching DUE_SOON threshold at 300 cycles remaining).

**What was NOT done in WS31-A:** The physical condition of the valve was not independently verified. The 314-cycle discrepancy means the valve was operated for approximately 10.5 months beyond what the card indicated, without any independent check. The card error does not in itself make the part unairworthy — the part is within its life limit — but the error reveals a systemic gap: if the card was 314 cycles behind, it was possible the physical valve had accumulated wear or damage that a time-based tracking system would have obscured.

Marcus Webb's compliance assessment (documented below) determined that given the magnitude of the discrepancy and the safety-criticality of the fuel selector valve function, a physical inspection was warranted before N88KV's next revenue flight.

---

## §2. OI-32-01: N88KV Fuel Selector Valve Physical Inspection

### §2.1 Compliance Determination — Marcus Webb (2026-06-17)

Marcus Webb reviewed the N88KV maintenance history and the ALS discrepancy finding on 2026-06-17 and issued the following determination:

> **Marcus Webb — Compliance Determination**
> Date: 2026-06-17
> Subject: N88KV (N88KV Cessna 208B Grand Caravan), P/N 9924721-1 Fuel Selector Valve — Physical Inspection Required
>
> **Findings reviewed:**
> - Fuel selector valve P/N 9924721-1, S/N FSV-208B-0847
> - ALS life limit: 12,000 cycles (Cessna D2101-13 §5-10-15, per Cessna SEB08-7)
> - Card-recorded accumulated cycles at WS31-A entry: 10,800
> - Logbook-confirmed accumulated cycles: 11,114
> - Discrepancy: 314 cycles (approximately 10.5 months of operations at N88KV's utilization rate)
> - Current ALS board: 11,114 cycles (corrected); 886 cycles remaining; status COMPLIANT
>
> **Determination:**
> The 314-cycle discrepancy between the maintenance card and the actual logbook indicates the valve was operated without current-status visibility for approximately 10.5 months. The fuel selector valve on the Cessna 208B is a flight-critical component: it controls fuel flow to the PT6A-114A engine. Failure modes include fuel starvation and engine stoppage.
>
> While the valve is within its life limit, the tracking gap means no one has formally assessed the physical condition of the valve against the accumulated cycle count since the last logbook-confirmed inspection. The 12,000-cycle limit is a calendar-based limit established under the assumption of routine condition monitoring. The monitoring gap is not routine.
>
> **I am determining that a physical inspection of the fuel selector valve is warranted before N88KV's next flight.** The inspection shall be performed per the Cessna 208B Aircraft Maintenance Manual (AMM) §28-20 (Fuel System — Fuel Selector Valve) and shall include:
> 1. Removal of the valve from the aircraft
> 2. Visual inspection for external wear, corrosion, and mechanical damage
> 3. Operational check of detents, seating, and sealing surfaces
> 4. Internal inspection per AMM §28-20-00 (disassembly, cleaning, inspection, reassembly)
> 5. Reinstallation and functional test
>
> Finding is to be documented in a new work order (WO-RDG-002). Aircraft is grounded pending inspection completion.
>
> — Marcus Webb, Director of Compliance, Athelon
> — 14 CFR §91.7 (Civil aircraft airworthiness); §91.409 (Inspection requirements); Cessna 208B AMM §28-20

### §2.2 Curtis Pallant — Coordination Call (2026-06-17)

Marcus called Curtis Pallant immediately after issuing the compliance determination.

**Curtis's initial response:** "I've been thinking about this since the onboarding. I knew the number was wrong. I didn't think to ground the plane over it — the part is within limits — but I understand your reasoning. If the card was wrong on the cycles, how do I know the physical condition of the valve matches what 11,114 cycles looks like? I don't, unless I look."

**Marcus:** "That's exactly the logic. The life limit is 12,000 cycles. You have 886 remaining. But the limit assumes the valve has been maintained in accordance with the AMM throughout its life. The tracking gap doesn't mean it wasn't maintained — Renard and Meredith do good work. It means there's no formal documentation of that maintenance being tied to the actual cycle count. The inspection closes that gap."

**Curtis:** "WO-RDG-002. I'll have Renard pull it this week. Who does the inspection — Renard or do you want your mechanic on site?"

Marcus discussed the option of sending Hector Ruiz from RMTS (who had performed the fuel selector valve replacement on WO-RMTS-003 in WS31-B and was thus experienced with the P/N 9924721-1 removal/installation procedure). However, Renard Osei — Ridgeline's lead A&P — was equally qualified. Curtis's preference was to use Ridgeline's own mechanic with Marcus present by video.

**Resolution:** Renard Osei performs the inspection at Ridgeline with Marcus available by video call during the critical disassembly and inspection steps.

**N88KV grounded:** 2026-06-17, per Curtis's written directive. Sierra Nevada Air Charter LLC (aircraft owner) was notified.

### §2.3 WO-RDG-002 — Fuel Selector Valve Physical Inspection

| Field | Value |
|---|---|
| WO Number | WO-RDG-002 |
| Aircraft | N88KV (Cessna 208B Grand Caravan) |
| Work type | Fuel Selector Valve Physical Inspection + Functional Check |
| Regulatory basis | 14 CFR §91.7; Cessna 208B AMM §28-20 |
| Opened by | Curtis Pallant (DOM), 2026-06-17 |
| Opened reason | Marcus Webb compliance determination OI-32-01 — physical inspection required pre-flight |
| Mechanic assigned | Renard Osei (AP-NV-11042) |
| Compliance oversight | Marcus Webb (remote, video call during inspection) |
| Scheduled | 2026-06-18 |
| WO status | OPEN |

### §2.4 Inspection Execution — 2026-06-18

**Inspection date:** 2026-06-18
**Time:** 08:00–14:20 PT
**Location:** Ridgeline Air Maintenance, Reno-Stead Airport (KRTS)
**Mechanic:** Renard Osei (AP-NV-11042)
**Remote oversight:** Marcus Webb (video call, 09:00–12:30 PT for disassembly and internal inspection)
**Curtis Pallant present on-site throughout**

#### §2.4.1 Removal and External Inspection (08:00–09:45)

Renard removed the fuel selector valve per Cessna 208B AMM §28-20-00, steps 1 through 12. The valve was removed with:
- Both fuel lines de-pressurized and capped
- Control cable disconnected from selector arm
- Valve secured in inspection fixture

**External inspection findings:**
- Housing: No visible corrosion, cracking, or impact damage. Housing finish shows normal oxidation consistent with age and environment (Reno-area altitude and UV exposure). **No discrepancy.**
- Selector arm: Detent engagement smooth and positive through all four positions (OFF, BOTH, LEFT, RIGHT). No slop or over-travel detected. **No discrepancy.**
- Mounting flange: Three of four mounting studs show normal thread engagement. **Fourth stud (aft-left position):** Thread engagement marginally short — approximately 2.5 turns where 3 turns is the AMM minimum. This was a subtle finding.

**Marcus (reviewing video feed):** "Renard, can you measure the thread engagement on that aft-left stud?"

Renard pulled a thread depth gauge. Result: 0.078 inches thread engagement. AMM minimum: 0.090 inches (3 full turns of AN6 thread).

**Marcus:** "That's below minimum. That stud was not seated to AMM spec. I want to know if that's been like that for a while or if it happened during removal."

Renard examined the stud threads under magnification. The stud was not cross-threaded; the thread form was clean. The stud had been at minimum engagement (or below) for an indeterminate period — there were compressive witness marks on the flange surface suggesting the valve had been installed at this engagement depth.

**Curtis:** "I didn't install that valve. It was on the aircraft when I took N88KV under contract three years ago. Whoever installed it last — it's been running at short thread engagement for three years."

**Marcus:** "That's a structural integrity discrepancy on a flight-critical fuel system component. That goes in the work order as a finding requiring repair before RTS."

#### §2.4.2 Internal Inspection (10:00–12:30, Marcus on video)

Renard disassembled the valve per AMM §28-20-00, steps 13 through 31. Marcus reviewed each component in real time via the video call.

**Internal inspection findings:**

*Rotor and valve body:*
- Valve body: Clean, no scoring, no corrosion. Normal slight staining from fuel contact (expected at this cycle count). **No discrepancy.**
- Rotor (selector disc): **Finding.** The rotor sealing surface on the LEFT tank port showed wear scoring — three parallel scratches approximately 0.006 inches deep running across the sealing face. These scratches are consistent with particulate contamination in the fuel, not with mechanical abuse. The scratches are within the AMM maximum allowable rework dimension (0.010 inches per AMM §28-20-00, Table 1), but they are the most significant internal finding.
- Rotor O-ring seating grooves: No cracking, no extrusion damage. O-rings intact. **No discrepancy.**
- Detent spring: Measured spring rate against AMM specification. Result: 92% of nominal spring rate (AMM allows 85–115%). **No discrepancy — within limits, but noted for next inspection.**

*Stem and bearing surfaces:*
- Selector stem: No scoring, no brinelling. **No discrepancy.**
- Stem seal (rubber): Slight hardening consistent with age and heat exposure. Within AMM acceptable limits. **Noted — recommend replacement at next valve maintenance event.**

**Marcus's inspection summary (live, at 12:30):** "Two findings. Finding 1: the mounting stud thread engagement is below AMM minimum — that requires a repair before reinstallation. Finding 2: the LEFT port rotor sealing surface has scoring that's within the AMM rework dimension but needs to be addressed. At 11,114 cycles, with 886 remaining to the life limit, I want to know if Cessna has a rework procedure that permits returning this rotor to service, or if the rotor needs to go."

Renard consulted the AMM §28-20-00, Table 1 and Figure 5. The AMM permits lapping of the rotor sealing surface using specified lapping compound up to 0.010 inches material removal. The scoring at 0.006 inches is within this envelope. Cessna Service Instruction SI-208-72 (Fuel Selector Valve Sealing Surface Rework) was on file at Ridgeline and authorized the lapping procedure with a post-rework fuel leakage test.

**Marcus:** "Do the rework. Lap the surface per SI-208-72. Then we do a fuel leakage test before reinstallation. And get a Helicoil or oversized stud in that mounting hole. Both findings resolved, we can close WO-RDG-002."

#### §2.4.3 Repair Execution (13:00–14:00)

**Finding 1 (thread engagement):** Renard installed a Helicoil insert (AN3-4A Helicoil, P/N 1185-3CN375, 0.375-inch length) in the aft-left mounting hole. Thread engagement post-Helicoil: 0.096 inches (3.2 turns). Within AMM specification. **Finding 1 CLOSED.**

**Finding 2 (rotor sealing surface scoring):** Renard performed rotor sealing surface lapping per Cessna SI-208-72, using Clover lapping compound Grade B (silicon carbide, 400 grit). Material removed: 0.0042 inches (within the 0.010 allowance). Post-lapping, the sealing surface showed no visible scoring under 10× magnification. **Finding 2 CLOSED pending fuel leakage test.**

#### §2.4.4 Reinstallation and Functional Test (14:00–14:20)

Renard reinstalled the valve per AMM §28-20-00 steps 32 through 47. New O-ring kit P/N 0620001-10 installed (O-ring kit was available in Ridgeline's consumables stock).

**Fuel leakage test per AMM §28-20-03:**
- System pressurized to 5 PSI with dry nitrogen
- All four positions tested (OFF, BOTH, LEFT, RIGHT)
- Zero fuel or gas leakage detected at any position
- Sealing surfaces holding to specification

**Operational check:**
- Control cable reconnected; selector travel through all four positions smooth and positive
- Detent engagement positive and crisp in all positions
- No binding, no over-travel, no false detent

**Result: SERVICEABLE — valve returned to service.**

**Marcus (reviewing the test video):** "No leakage, clean operation, both findings resolved, Helicoil holding, rotor surface confirmed clean. WO-RDG-002 is ready to close."

### §2.5 WO-RDG-002 Closure

| WO-RDG-002 Closure |  |
|---|---|
| Completed by | Renard Osei (AP-NV-11042) |
| Regulatory basis | 14 CFR §43.9; Cessna 208B AMM §28-20; Cessna SI-208-72 |
| Findings documented | Finding 1: Aft-left mounting stud below AMM thread engagement — Helicoil installed, CLOSED. Finding 2: LEFT port rotor sealing surface scoring 0.006 in — lapping per SI-208-72, post-rework leakage test PASS, CLOSED. |
| Parts used | Helicoil AN3-4A (P/N 1185-3CN375), O-ring kit P/N 0620001-10 |
| RTS signed | Curtis Pallant (DOM-NV-0044, IA-NV-8826), 2026-06-18 |
| Part 145 cert on release | VRRS3941 |
| Compliance sign-off | Marcus Webb reviewed findings and repairs remotely; APPROVED |
| N88KV status | Airworthy — returned to service 2026-06-18 |
| WO status | ✅ CLOSED |

### §2.6 ALS Board Confirmed Post-Inspection

Post-WO-RDG-002 closure, Marcus confirmed the ALS board for N88KV:
- Fuel selector valve P/N 9924721-1: 11,114 cycles (corrected per WS31-A); 886 cycles remaining to 12,000-cycle limit; status COMPLIANT
- No cycle advancement during the inspection itself (removed and reinstalled; not an operational cycle)
- ALS board confirmed accurate

**OI-32-01 is CLOSED.**

---

## §3. OI-32-02: N4421T TBM 850 PT6A-66D ALS Full Audit

### §3.1 Background

N4421T (TBM 850, P&WC PT6A-66D, S/N PCE-67104) was entered into Athelon during the WS31-A onboarding ALS co-build session (2026-05-16 through 2026-05-17). At that time, 23 ALS items were entered (12 airframe + 7 engine LLP + 4 engine CMR). All items were COMPLIANT at entry.

The WS31-A co-build was a collaborative session between Marcus and Curtis, working from the PT6A-66D Engine Maintenance Manual (PWEC Document 3021843). However, the Phase 31 gate review classified the N4421T ALS entry as a *co-build session* rather than a *formal audit*. The distinction:

- A **co-build session** populates the ALS board; it confirms the items are entered but does not formally verify that all applicable items have been identified from all applicable source documents.
- A **formal ALS audit** cross-references all source documents against the ALS board, verifies item completeness, validates life limits against the current document revision, and confirms accumulated values against original maintenance records (engine logs, logbook).

The Phase 32 OI-32-02 audit was the formal audit. Marcus Webb leads; Curtis Pallant provides documents and physical access to the aircraft.

### §3.2 N4421T TBM 850 — ALS Audit (2026-06-19 through 2026-06-23)

**Audit lead:** Marcus Webb
**On-site counterpart:** Curtis Pallant
**Method:** Marcus reviewed source documents on-site at Ridgeline (2026-06-19) and remotely (2026-06-20 through 2026-06-23)
**Source documents reviewed:**
1. PWEC Document 3021843 — PT6A-66D Engine Maintenance Manual, §05-10 (Life-Limited Parts) and §05-20 (CMR Items) — Revision 10 (most current)
2. TBM Aircraft Service Manual (TBMIA) — Doc 70-3-111, Chapter 04 (Airworthiness Limitations) — Revision 7
3. TBM Aircraft Structural Repair Manual — Chapter 51 (Structural Limits) — referenced for longevity limits
4. N4421T engine logbook (PT6A-66D S/N PCE-67104) — complete since new engine manufacture
5. N4421T airframe logbook — complete since new airframe manufacture
6. Original Athelon ALS board entries (co-built in WS31-A)

### §3.3 Audit Findings — Item Completeness

**PT6A-66D Engine LLP (§05-10 review):**

Marcus reviewed the PWEC Document 3021843 §05-10 table against the 7 items entered in WS31-A. The co-build session captured the primary LLP items correctly. However, the formal audit identified 2 additional items that were present in §05-10 but not captured in the co-build:

| Item # | Component | P/N | Life Limit | Status at Audit |
|---|---|---|---|---|
| 8 (NEW) | Gas Generator Case Assembly | 3028750-01 | 20,000 cycles | 12,847 cycles accumulated; 7,153 remaining; **COMPLIANT** |
| 9 (NEW) | Power Turbine Inlet Housing | 3028751-02 | 15,000 cycles | 12,847 cycles accumulated; 2,153 remaining; **DUE_SOON** |

**Power Turbine Inlet Housing finding (Item 9):** At 2,153 cycles remaining to a 15,000-cycle limit, this component is at 85.6% of its life — well within the DUE_SOON threshold of 15% remaining (2,250 cycles). In fact, the component is already past the DUE_SOON threshold.

**Marcus:** "This part should have been DUE_SOON on the board from day one. It wasn't in the board because we didn't capture it in the co-build session. That's why a formal audit is different from a co-build. The co-build gets you the big items. The audit gets you everything."

**Curtis:** "How long do I have on this before I need to act?"

**Marcus:** "2,153 cycles at your utilization — N4421T flies roughly 2 cycles a day on the owner's schedule. That's about 14 months. It's not an emergency. But the procurement lead time for a Power Turbine Inlet Housing from P&WC — typically 90 to 120 days. The system is going to flag that for you now that it's in the board."

**PT6A-66D CMR Items (§05-20 review):**

The co-build captured 4 CMR items. The formal audit confirmed all 4 were correct and no additional CMR items were present in the current revision. ✅

**TBM 850 Airframe ALS Items (TBMIA Doc 70-3-111 §04 review):**

The co-build captured 12 airframe items. The formal audit cross-referenced the TBMIA Doc 70-3-111 §04 table in full. Two corrections were required:

| Item | Correction | Details |
|---|---|---|
| Main Landing Gear Side Stay (airframe item 6) | Life limit updated | Co-build entered 12,000 cycles per an earlier revision. TBMIA Rev 7 shows 15,000 cycles (limit was extended in Rev 6, 2023). The item is now at 80 cycles accumulated — trivially affected. |
| Rudder Torque Box Assembly (airframe item 11) | New item added (airframe, previously omitted) | Present in TBMIA Rev 7 §04 Table 4; not in earlier revisions. Life limit: 20,000 cycles. N4421T: 9,180 cycles accumulated; 10,820 remaining. COMPLIANT. |

**Post-audit ALS board for N4421T TBM 850:**

| Category | Items Before Audit | Items After Audit | Correction Type |
|---|---|---|---|
| Engine LLP (PT6A-66D) | 7 | 9 | +2 new items |
| Engine CMR (PT6A-66D) | 4 | 4 | No change |
| Airframe ALS (TBM 850) | 12 | 13 | +1 new item; 1 life limit corrected |
| **Total** | **23** | **26** | **+3 items; 1 limit corrected** |

**Items by status post-audit:**
- COMPLIANT: 25
- DUE_SOON: 1 (Power Turbine Inlet Housing — 2,153 cycles remaining)
- OVERDUE: 0

### §3.4 Procurement Action Triggered

The Power Turbine Inlet Housing (P/N 3028751-02) at DUE_SOON status triggered an F-1.4-E procurement lead time alert immediately upon entry. The system's advisory:

> **PROCUREMENT ADVISORY — N4421T (TBM 850)**
> Component: Power Turbine Inlet Housing P/N 3028751-02
> Current accumulated: 12,847 cycles / Limit: 15,000 cycles / Remaining: 2,153 cycles
> Estimated depletion: ~14 months (based on 2-cycle/day utilization)
> P&WC average procurement lead time (PT6A-66D LLP): 90–120 days
> **Recommended procurement action: begin sourcing by 2026-12-01**

Curtis acknowledged the advisory and noted that he would contact P&WC Authorized Service Center (Reno-based) to request a price estimate and lead time confirmation.

### §3.5 TBM 850 vs. Prior ALS Audits — Differences Noted

Marcus documented the methodological differences between the N4421T turboprop ALS audit and prior audits for context:

**Reciprocal aircraft (Bonanza, Centurion, Malibu Mirage):**
No ALS items applicable. Manufacturer's recommended TBO is advisory, not regulatory (14 CFR Part 91 operations). Maintenance manual references are condition-based for most components. No life-limiting tracking required.

**Piston twin (Priya's Beech 200, Bill Reardon's Seneca II):**
Limited LLP tracking — primarily engine overhaul intervals (manufacturer-recommended TBO, not ALS items). No cycle-based component limits.

**Turboshaft / rotorcraft (Bell 206B-III, S-76C, Robinson R44):**
ALS items are cycle-based (rotor system components) and time-based (drive train, gearboxes). Two source documents required: airframe manufacturer ALS and engine manufacturer CMM. Part 27 type certification. Marcus's prior experience is primarily rotorcraft ALS.

**Turboprop fixed-wing (C208B, TBM 850):**
Similar two-document structure (airframe ICA + engine CMM/maintenance manual). Part 23 type certification. Key difference from rotorcraft: PT6A-series engine CMMs have substantially more life-limited components than reciprocal or turboshaft ICAs. The PT6A-66D §05-10 table has 9 LLP items and 4 CMR items; the PT6A-114A §05-10 table has 11 LLP items and 3 CMR items. This density means co-build sessions are more likely to miss items than an explicit formal audit — which is exactly what Phase 32 demonstrated.

**Marcus's audit note:** "The lesson from the N4421T co-build vs. formal audit comparison is that for high-LLP-density engines like the PT6A series, co-build sessions during onboarding are not sufficient as a compliance audit. The template library helps — it pre-populates known items — but the formal audit against the current manual revision is not optional. We found 3 items in 23 that the co-build missed. In a rotorcraft ALS with 44 items, that proportion could mean 5 or 6 missed items. Protocol going forward: all turbine engine ALS entries require a formal audit within 60 days of the initial co-build session."

**Protocol addition:** Marcus filed OI-32-02-P01 — a standing protocol for all new turbine aircraft onboarding requiring a formal ALS audit within 60 days of the initial ALS data entry session. This will be added to the Athelon DOM onboarding checklist.

### §3.6 OI-32-02 Resolution

| Item | Resolution |
|---|---|
| N4421T ALS board completeness | 3 items added; 1 limit corrected; ALS board confirmed complete against PWEC 3021843 Rev 10 + TBMIA Doc 70-3-111 Rev 7 |
| DUE_SOON finding | Power Turbine Inlet Housing at 2,153 cycles remaining; procurement advisory filed; Curtis acknowledged |
| Scheduling triggered | N4421T owner notified of DUE_SOON item; replacement scheduled for ~2027-08-01 (14 months out) |
| Protocol addition | Formal ALS audit within 60 days of initial entry — protocol filed OI-32-02-P01 |
| ALS board confirmed | ✅ Accurate as of 2026-06-23 |

**OI-32-02 is CLOSED.**

---

## §4. Phase 32 Open Item Resolution Summary

| OI ID | Description | Status |
|---|---|---|
| OI-32-01 | N88KV fuel selector valve physical inspection | ✅ CLOSED — inspection performed 2026-06-18; two findings (thread engagement, rotor scoring) — both resolved; valve returned to service; WO-RDG-002 CLOSED |
| OI-32-02 | N4421T TBM 850 PT6A-66D ALS formal audit | ✅ CLOSED — 3 items added; 1 limit corrected; 1 DUE_SOON finding (Power Turbine Inlet Housing, 2,153 cycles remaining); procurement advisory filed; formal audit protocol established |

---

## §5. Curtis Pallant — Post-WS32-B Assessment

**Curtis Pallant (recorded 2026-06-23):**

*"The fuel selector valve — I want to be honest about what I felt when Marcus told me we needed to ground the airplane. My first reaction was 'the part is in limits, this is overcautious.' My second reaction, after about thirty seconds, was 'this is what I would tell a customer if it were their aircraft.' I would say: we found a tracking gap, the only way to be certain is to look. So that's what we did.*

*"And we found two things that needed fixing. A Helicoil in the mounting hole that's been underengaged for three years. Rotor scoring that was within limits but needed the lapping procedure. Neither of those things shows up in a cycle count. You have to look at the part.*

*"The N4421T audit — finding three items the co-build missed — that's the one that will stick with me. I've been managing that engine logbook for four years. I was confident I knew what was in it. Turns out I didn't have the Power Turbine Inlet Housing on my radar at all. I would have found it eventually — probably when it got close enough to look alarming — but I wouldn't have had a procurement lead time alert telling me to order twelve months out. I would have found it at two months out, with a 90-day lead time, and had a problem.*

*"I'm not a skeptic anymore. These two things, done right, in the same week — that's the product doing what it's supposed to do."*

---

*WS32-B complete. OI-32-01 CLOSED (N88KV fuel selector valve inspected, two findings resolved, valve returned to service). OI-32-02 CLOSED (N4421T TBM 850 formal ALS audit complete, 3 items added, 1 limit corrected, 1 DUE_SOON finding with procurement advisory). Formal turbine ALS audit protocol established.*
