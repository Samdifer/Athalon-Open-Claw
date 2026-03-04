# WS31-C — LSR Combined June 2026 Maintenance Event (N76LS)
**Shop:** Lone Star Rotorcraft, Fort Worth TX (KFTW)
**DOM:** Sandra Okafor (DOM-TX-0082, IA-TX-6117)
**Aircraft:** N76LS (Sikorsky S-76C, S/N 760346)
**Aircraft TT at event:** 3,847.2 hours (updated from WS30-D review value of 3,810.4 hr; 36.8 hr flown in intervening period)
**Work orders executing:** WO-LSR-ALS-001, WO-LSR-ALS-002, WO-LSR-ALS-003
**Performing mechanic:** Tobias Ferreira (A&P Helicopter, AP-TX-31042)
**DOM / RTS:** Sandra Okafor (DOM-TX-0082, IA-TX-6117)
**Compliance observer:** Marcus Webb (Athelon, remote)
**Status:** ✅ DONE
**Event dates:** 2026-06-08 through 2026-06-10
**Significance:** First simultaneous multi-WO ALS compliance event at Lone Star Rotorcraft; three life-limited components replaced in a single coordinated maintenance window

---

## §1. Pre-Event Context

### §1.1 The Three Open Work Orders

Three work orders were opened in Phase 30 (WS30-D, 2026-05-01 through 2026-05-02) following the N76LS DUE_SOON review session. As of the June event:

| WO | Component | Life Limit | TT at Limit | TT at Event | Hours Remaining |
|---|---|---|---|---|---|
| WO-LSR-ALS-001 | Main Rotor Hub Yoke (P/N 76250-00200) | 4,000 hr TT | 4,000 hr | 3,847.2 hr | 152.8 hr |
| WO-LSR-ALS-002 | Tail Rotor Hub Assembly (P/N 76390-00110) | 4,000 hr TT | 4,000 hr | 3,847.2 hr | 152.8 hr |
| WO-LSR-ALS-003 | Main Rotor Dampeners, set of 4 (P/N 76250-04003) | 2,200 hr component | ~2,200 hr | 1,911.5 hr component | 288.5 hr |

**N76LS status at event start (2026-06-08):** Aircraft TT 3,847.2 hours. Main Rotor Hub Yoke and Tail Rotor Hub approaching limit faster than planned — N76LS flew more hours than Sandra's projected utilization in May. The original June 15–17 window was moved forward to June 8–10 when N76LS reached 3,840 hours and Sandra noticed the remaining buffer narrowing.

**Sandra (2026-06-04 decision note):** "We're at 3,840 hours. At the current pace — about 10 hours per week — we'll hit 3,990 hours by June 20th, which is inside the 10-hour buffer I want to maintain before the 4,000-hour limit. I'm moving the maintenance window to June 8. Parts are here. Tobias is available. Devon [Lone Star Executive Charter] confirmed the window can shift. No reason to wait."

### §1.2 Parts Status at Event Start

**WO-LSR-ALS-001 / WO-LSR-ALS-002 parts (Main Rotor Hub Yoke + Tail Rotor Hub):**
- Ordered 2026-05-01 (PO#LSR-20260501-001), Sikorsky Customer Support, through Sikorsky's authorized parts distributor for the South-Central region
- Expected delivery: 2026-06-12 (original)
- **Actual delivery: 2026-06-03** — Sikorsky Customer Support expedited shipment when Sandra called to check status on 2026-05-28. Sandra had been tracking the PO weekly. On 2026-05-28, she noted the original delivery estimate would land only 12 days before the planned work window and called to escalate. Sikorsky moved the shipment to priority air. The parts arrived 2026-06-03 — 9 days ahead of original estimate.
- Parts received: Main Rotor Hub Yoke P/N 76250-00200, S/N 260346-MH-2026 (new); Tail Rotor Hub P/N 76390-00110, S/N 260346-TR-2026 (new). Both with new FAA/Bilateral Aviation Safety Agreement (BASA) Airworthiness Approval Tags.

**WO-LSR-ALS-003 parts (Main Rotor Dampeners):**
- Ordered 2026-05-02 (PO#LSR-20260502-001)
- Delivered 2026-05-24 (3 days ahead of estimate)
- Main Rotor Dampener set, P/N 76250-04003, set of 4, S/Ns 260346-D1-2026 through D4-2026

All parts were stored in Lone Star Rotorcraft's parts room from date of receipt. Devraj entered all three receiving records and 8130-3/BASA tags into Athelon on receipt dates.

### §1.3 Maintenance Event Clustering — A Manual Coordination Achievement

The decision to combine WO-LSR-ALS-001, -002, and -003 into a single maintenance window was a manual coordination call made by Tobias Ferreira during the WS30-D review session. Tobias observed that all three components shared a common access path — the main rotor head — and that replacing them separately would require three separate full rotor-head disassemblies, each representing 6–8 hours of labor and risk of re-torque error.

By combining them, Lone Star Rotorcraft saves one full rotor-head pull (estimated 6–8 hours of labor saved), reduces N76LS downtime from ~7 operating days (three separate events) to 3 operating days (one combined event), and eliminates the risk of re-torque errors introduced by repeated head disassembly.

**This is exactly the scenario that motivated v1.4 F-1.4-F (Maintenance Event Clustering)** — but at the time of planning, that feature wasn't in the system yet. The coordination happened manually, through Tobias's experience and Sandra's planning instinct. The combined event, having occurred, provides the definitive real-world UAT scenario for F-1.4-F: what the system should have surfaced automatically, but didn't — and what it will surface in v1.4.3.

**Sandra's pre-event note:** "We did the clustering manually this time. Tobias said 'why would you pull the head three times when you can pull it once.' That's the right answer. But I had to figure that out by asking Tobias. The next shop that gets three DUE_SOON items at the same time won't know to ask Tobias. The system should tell them."

---

## §2. Work Execution — 2026-06-08 through 2026-06-10

**Reference:** Sikorsky S-76C Maintenance Manual (SMM-S76C-0001, current revision), Chapter 04 (Airworthiness Limitations), Chapter 62 (Main Rotor), Chapter 64 (Tail Rotor), Chapter 67 (Rotor Controls)

### §2.1 Day 1 — 2026-06-08: Main Rotor Head Removal and Component Inspection

N76LS was positioned in Lone Star Rotorcraft's primary hangar bay with the rotor head tooling stand staged. Tobias began work at 07:30 CDT.

**Pre-work checklist (per S-76C SMM Chapter 04 Life-Limited Parts Replacement procedure):**
- N76LS ground power connected; batteries disconnected; flight controls safetied ✅
- Main rotor blade set (4 blades) removed and staged per SMM §62-20-00 Blade Removal ✅
- Blade tracking/balancing equipment booked for Day 3 post-installation ✅
- Rotor head tooling stand positioned; head lift fixture installed ✅

**Main Rotor Hub Yoke removal (per SMM §62-10-00 Main Rotor Head Removal):**
- All main rotor head retention hardware removed; torque values documented before removal
- Main rotor head assembly raised from mast using lift fixture; mast cap secured
- Main Rotor Hub Yoke (P/N 76250-00200, S/N original: 260346-MH-1986) identified on head assembly — manufacturing date placard confirmed; total time placard reads 3,847.2 hr
- Yoke removal: 8x main yoke-to-hub bolts removed; yoke extracted from hub assembly
- **Retired yoke tagged by Tobias:** P/N 76250-00200 / S/N 260346-MH-1986 / LIFE LIMIT RETIRED — 3,847.2 hr at retirement; limit 4,000 hr. Not to be returned to service.

**Tail Rotor Hub removal (per SMM §64-10-00 Tail Rotor Hub Removal):**
With the main rotor head off the mast, Tobias moved to the tail rotor. Tail rotor hub removal is more straightforward — accessible from ground level with the correct tooling.
- Tail rotor blades removed per SMM §64-20-00 ✅
- Tail Rotor Hub Assembly (P/N 76390-00110, S/N 260346-TR-1986) removed; retention hardware torques documented
- **Retired hub tagged:** P/N 76390-00110 / S/N 260346-TR-1986 / LIFE LIMIT RETIRED — 3,847.2 hr; limit 4,000 hr. Not to be returned to service.

**Main Rotor Dampener set inspection (per SMM §62-10-30):**
With the main rotor head on the stand and the hub yoke removed, Tobias accessed the four main rotor dampeners. Each dampener was removed individually:
- Dampener #1 (S/N 260346-D1-original): component time placard reads 1,911.5 hr; limit 2,200 hr — retired
- Dampener #2 through #4: same condition — all retired
- **Retired dampener set tagged:** P/N 76250-04003 (4 units) / component times: D1–D4 all 1,911.5 hr / limit 2,200 hr. LIFE LIMIT RETIRED. Not to be returned to service.

**Day 1 end state:** All six life-limited component units removed and retired; tagged, documented, and photographed (photos uploaded to Athelon work orders by Tobias from his tablet, 2026-06-08 18:00 CDT).

**Tobias (end of Day 1):** "All the old hardware is out. Six pieces. Forty years of combined hours between them, roughly. Now we put in six new pieces and give this machine another service life."

---

### §2.2 Day 2 — 2026-06-09: Installation

**Main Rotor Dampener installation (first, per SMM §62-10-30 Dampener Installation):**
With the rotor head on the stand, dampeners are installed before yoke installation.
- Four new dampeners (P/N 76250-04003, S/Ns 260346-D1-2026 through D4-2026) installed in sequence
- Retention hardware torqued per SMM §62-10-30 Table 2 torque values: 45–55 ft-lb per dampener retaining nut
- Torque wrench calibration confirmed current: Cal Card #LSR-TW-001, due 2026-09-14
- All four dampeners installed, torqued, safety-wired per procedure ✅

**Main Rotor Hub Yoke installation (per SMM §62-10-00 Yoke Installation):**
- New yoke (P/N 76250-00200, S/N 260346-MH-2026) inspected per receipt inspection; 8130-3/BASA tag confirmed ✅
- Yoke installed onto hub assembly; 8x main yoke-to-hub bolts installed in sequence per SMM §62-10-00 torque sequence
- Torque: 85–95 ft-lb per SMM Table 1, confirmed ✅
- Safety wire installed per SMM procedure ✅

**Main rotor head reinstalled on mast:**
- Head assembly (with new yoke and new dampeners) reinstalled on mast using lift fixture per SMM §62-10-00 Installation procedure
- Head retention hardware torqued per SMM torque table ✅
- Main rotor blades reinstalled per SMM §62-20-00 ✅

**Tail Rotor Hub installation (per SMM §64-10-00 Hub Installation):**
- New tail rotor hub (P/N 76390-00110, S/N 260346-TR-2026) inspected; 8130-3/BASA tag confirmed ✅
- Hub installed per SMM §64-10-00; retention hardware torqued to 60–70 ft-lb per SMM Table 1 ✅
- Tail rotor blades reinstalled per SMM §64-20-00 ✅

**Day 2 end state:** All components installed; all hardware torqued and safety-wired; aircraft back on gear; rotor head clearances within spec.

---

### §2.3 Day 3 — 2026-06-10: Track and Balance, Ground Run, RTS

**Main rotor track and balance (per SMM §62-33-00 Main Rotor Track and Balance):**
Required after any main rotor head component replacement. Lone Star Rotorcraft uses a CHADWICK-HELMUTH 8500-A-3 analyzer.
- Ground run #1: Baseline vibration and track measurement — 1/rev vibration: 0.31 IPS (within 0.40 IPS limit per SMM §62-33-00); track spread: ±0.08 inch (within ±0.125 inch limit) ✅
- No pitch link adjustment required; track and balance PASS on first run ✅

**Full ground run (per SMM §05-20-00 Post-Maintenance Run-Up procedure):**
- Engine start, warm-up; all systems checked
- Hydraulic system: normal; no leaks observed
- Rotor system: smooth through all RPM ranges; no abnormal vibration
- 5-minute full-power ground run; all parameters in limits ✅
- Shut down; post-run inspection: all hardware dry, no leaks ✅

**WO-LSR-ALS-001 maintenance release:**
> **WO-LSR-ALS-001 — MAINTENANCE RELEASE**
>
> Aircraft: N76LS (Sikorsky S-76C, S/N 760346). Task: Main Rotor Hub Yoke retirement and replacement per S-76C ICA §04.2.1 (4,000 hr life limit). Removed and retired P/N 76250-00200 S/N 260346-MH-1986 at 3,847.2 hr TT. Installed new P/N 76250-00200 S/N 260346-MH-2026 per SMM §62-10-00. Main rotor track and balance: 1/rev 0.31 IPS PASS. Full ground run PASS.
>
> Aircraft airworthy. Returned to service.
> — Sandra Okafor, DOM-TX-0082, IA-TX-6117, 2026-06-10, 16:14 CDT

**WO-LSR-ALS-002 and WO-LSR-ALS-003 maintenance releases:** Filed simultaneously; same format, same RTS signature, same date and time.

**Marcus Webb compliance review (remote, 2026-06-10, 17:30 CDT):**
Marcus reviewed all three WO documentation packages. All three WOs meet 14 CFR §43.9 and §43.11 requirements. All 8130-3/BASA tags properly executed. Retirement records complete. Torque documentation complete.

**Marcus compliance sign-off:** ✅ APPROVED — WO-LSR-ALS-001, -002, -003, 2026-06-10, 17:30 CDT

---

## §3. ALS Board Updates

Devraj updated N76LS's ALS board following WO closures, 2026-06-10:

| Component | Before Event | After Event |
|---|---|---|
| Main Rotor Hub Yoke | 3,847.2 hr / **152.8 hr remaining** / DUE_SOON | **0 hr accumulated** / **4,000 hr remaining** / ✅ COMPLIANT |
| Tail Rotor Hub | 3,847.2 hr / **152.8 hr remaining** / DUE_SOON | **0 hr accumulated** / **4,000 hr remaining** / ✅ COMPLIANT |
| Main Rotor Dampeners | 1,911.5 hr comp / **288.5 hr remaining** / DUE_SOON | **0 hr accumulated** / **2,200 hr remaining** / ✅ COMPLIANT |

**N76LS ALS board post-event:**
- OVERDUE items: 0
- DUE_SOON items: 0 (previously 3)
- COMPLIANT items: 33 (all items)

---

## §4. How Event Clustering Validated F-1.4-F

The June maintenance event was planned before F-1.4-F (Maintenance Event Clustering) existed in Athelon. The clustering decision was made manually during the WS30-D session, by Tobias observing that all three components shared a common access path.

Had F-1.4-F been live when Sandra and Tobias were planning in May, the system would have:
1. Detected that WO-LSR-ALS-001 and -002 both had N76LS projected to reach their limit within the same ~153-hour window
2. Detected that WO-LSR-ALS-003 had N76LS reaching its component limit within ~289 hours — within a configurable clustering window (default 200 hr or expanded to 300 hr for the actual scenario)
3. Surfaced a suggested combined maintenance event on Sandra's dashboard: "3 ALS items on N76LS are due within 300 hours — combine into one maintenance event?"
4. Allowed Sandra to accept the suggestion, generating a unified work event block with all three WOs linked

Instead, Sandra had to ask Tobias. Tobias had the right answer. Not every shop will have a Tobias who asks the right question. F-1.4-F is the system asking the question for every DOM on every aircraft.

**Sandra's UAT note (filed during WS31-D UAT, 2026-06-06):** "The clustering feature would have saved me 20 minutes of coordination and two phone calls in May. It also would have prompted me to order the dampener parts at the same time as the rotor parts — one PO instead of two, same delivery timeline. The system saw what Tobias saw, but it would have seen it before we had a meeting about it."

---

## §5. Sandra Okafor — Post-Event Debrief (2026-06-10, post-RTS)

**Sandra (recorded at Lone Star Rotorcraft, 2026-06-10, 18:00 CDT):**

"Three work orders closed in one afternoon. That's what it looks like on a screen — three status lines going from open to closed in about 90 seconds of Devraj's time. What it looks like in the hangar is three days of Tobias doing the most careful work I've ever watched him do, because these are the parts that hold the main rotor on, and there's no version of getting that wrong.

"The thing I keep coming back to is the traceability. When we retired the old yoke and the old hub, Tobias tagged them and I took photos. Those photos are in Athelon. Those serial numbers are in Athelon. If anyone ever asks — an FAA safety team, an insurer, a future owner of this aircraft — why was the main rotor hub replaced in June 2026, the answer isn't 'we think we documented it somewhere.' The answer is WO-LSR-ALS-001. It's there. It has the S/N of the part we took off, the S/N of the part we put on, the work order, the ground run results, my signature. Full chain.

"We found the CMR overdue item in April 2025 because we sat down with the logbooks for four hours and entered the data. That was the hard work. After that, the system did its job. It tracked 36 items on N76LS without me having to update a spreadsheet after every flight. It told me in May that two items were at 189 hours remaining. That number was real and I could act on it in time. Today I'm looking at a dashboard with zero DUE_SOON items on N76LS. That's the first time I've seen that since we got this aircraft. It's clean. All 33 items COMPLIANT.

"What does it feel like? Honestly? It feels like I can breathe for the first time in about six months. When I saw the DUE_SOON items building up, I was carrying that in my head. Now the system is carrying it. When those numbers start coming up again — and they will, because N76LS keeps flying — I'll see it on the dashboard before it becomes a problem. That's the deal. That's what I signed up for when I agreed to put my data in."

---

## §6. Follow-Up Items for the ALS Board

| Item ID | Description | Action |
|---|---|---|
| FU-31-C-01 | N76LS next ALS review at ~4,200 hr TT (projected Q4 2026) — check remaining items for new DUE_SOON entrants | Sandra to schedule quarterly ALS review |
| FU-31-C-02 | Main Rotor Dampeners (new set): next life limit at 2,200 hr component time (~6,047 hr aircraft TT at ~0.5 component/aircraft ratio) — no near-term action | Monitor in Athelon |
| FU-31-C-03 | Post-event track and balance records filed with N76LS maintenance history — Devraj to attach analyzer printout to WO-LSR-ALS-001 | Devraj task, 2026-06-11 |
| FU-31-C-04 | New rotor parts warranty registration: Sandra to submit Sikorsky warranty registration for P/N 76250-00200 and P/N 76390-00110 within 30 days of installation | Sandra task, due 2026-07-10 |

---

## §7. WO Closure Summary

| Work Order | Component Replaced | Retired P/N + S/N | Installed P/N + S/N | Retired At | Limit | Status |
|---|---|---|---|---|---|---|
| WO-LSR-ALS-001 | Main Rotor Hub Yoke | 76250-00200 / 260346-MH-1986 | 76250-00200 / 260346-MH-2026 | 3,847.2 hr TT | 4,000 hr | ✅ CLOSED |
| WO-LSR-ALS-002 | Tail Rotor Hub Assembly | 76390-00110 / 260346-TR-1986 | 76390-00110 / 260346-TR-2026 | 3,847.2 hr TT | 4,000 hr | ✅ CLOSED |
| WO-LSR-ALS-003 | Main Rotor Dampener Set | 76250-04003 / D1–D4 original | 76250-04003 / D1–D4 2026 | 1,911.5 hr comp | 2,200 hr | ✅ CLOSED |

**All three WOs closed; Sandra Okafor RTS signed; Marcus Webb compliance APPROVED; N76LS ALS board updated; N76LS returned to service 2026-06-10.**

---

*WS31-C is complete. N76LS flew for three days with three life-limited components approaching retirement. They were replaced in a single coordinated event. The ALS board is clean. Sandra Okafor can breathe.*
