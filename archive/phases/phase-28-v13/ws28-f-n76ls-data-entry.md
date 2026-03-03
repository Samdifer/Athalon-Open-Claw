# WS28-F — N76LS Initial ALS Data Entry Session (Lone Star Rotorcraft S-76C)
**Phase:** 28
**Status:** ✅ COMPLETE — SIGNED
**Session Date:** 2026-04-11
**Filed:** 2026-04-12

**Owners:**
- Sandra Okafor — DOM, Lone Star Rotorcraft, Fort Worth TX (data entry, sign-off)
- Marcus Webb — Compliance Architect (data validation, baseline confirmation)

**Aircraft:** N76LS — Sikorsky S-76C, Lone Star Rotorcraft
**Prerequisite:** F-1.3-B (S-76C Part 29 ALS Tracking UI) live in production; N76LS compliance surface activated (v1.3, 2026-04-07)

---

## Table of Contents

1. [Session Overview](#1-session-overview)
2. [S-76C ALS + CMR Item Baseline — All 33 Items](#2-s-76c-als--cmr-item-baseline)
3. [Compliance State Summary](#3-compliance-state-summary)
4. [Any Flags or Immediate Actions](#4-any-flags-or-immediate-actions)
5. [Sandra Okafor Sign-Off](#5-sandra-okafor-sign-off)

---

## 1. Session Overview

**Participants:** Sandra Okafor (DOM), Marcus Webb (Compliance, remote video)
**Duration:** 3 hours 20 minutes
**System:** Athelon production (v1.3, F-1.3-B active for N76LS)

**Purpose:** Enter all 33 S-76C ALS and CMR items for N76LS, record baseline hours/cycles for each item, and establish N76LS's complete compliance state in Athelon. This session is the operational follow-through on v1.3's N76LS feature activation.

**Source documents Sandra brought to session:**
- N76LS maintenance records (logbooks)
- Sikorsky S-76C ICA (Airworthiness Limitations Section, Chapter 04)
- Turbomeca Arriel 2S1 ICA (engine component life limits)
- Last overhaul records for main gearbox, tail rotor gearbox, freewheeling unit
- N76LS current total time: **4,122.7 hours**

**Marcus's pre-session note:**

> "I reviewed the WS27-B S-76C ALS audit items before this session. All 33 items are correctly configured in the S-76C template library (F-1.3-B). Sandra's job today is to enter the baseline hours/cycles from the logbooks — not to re-verify the life limits, which we validated in Phase 27. If we find a discrepancy between what's in the template and what the logbooks say, we stop and resolve it before proceeding. Sandra should not enter a value she can't confirm in the maintenance records."

---

## 2. S-76C ALS + CMR Item Baseline — All 33 Items

*All hours recorded as of N76LS current total time: 4,122.7 hours*
*Life limits from Sikorsky S-76C ICA Chapter 04 + Turbomeca Arriel 2S1 ICA*
*Validated against WS27-B ALS audit*

### 2.1 Main Rotor System (10 items)

| # | Component | ICA Ref | Life Limit | Interval Type | Baseline Hours on Component | Hours Remaining | Status |
|---|---|---|---|---|---|---|---|
| 1 | Main Rotor Hub Assembly (Yoke) | S76-ALS-04.2.1 | 5,000 hr | HOURS | 3,847.2 | 1,152.8 | ✅ WITHIN_LIMIT |
| 2 | Main Rotor Mast Assembly | S76-ALS-04.2.2 | 5,000 hr | HOURS | 3,847.2 | 1,152.8 | ✅ WITHIN_LIMIT |
| 3 | Main Rotor Blades (composite, pair) | S76-ALS-04.2.3 | 5,000 hr | HOURS | 2,104.6 | 2,895.4 | ✅ WITHIN_LIMIT |
| 4 | Main Rotor Pitch Change Links | S76-ALS-04.2.4 | 3,500 hr | HOURS | 1,847.2 | 1,652.8 | ✅ WITHIN_LIMIT |
| 5 | Main Rotor Pitch Change Link Bearings | S76-ALS-04.2.5 | 3,500 hr | HOURS | 1,847.2 | 1,652.8 | ✅ WITHIN_LIMIT |
| 6 | Swashplate Assembly — Upper (rotating) | S76-ALS-04.2.6 | 3,000 hr | HOURS | 1,847.2 | 1,152.8 | ✅ WITHIN_LIMIT |
| 7 | Swashplate Assembly — Lower (non-rotating) | S76-ALS-04.2.7 | 3,000 hr | HOURS | 1,847.2 | 1,152.8 | ✅ WITHIN_LIMIT |
| 8 | Main Rotor Hub Spindle (set) | S76-ALS-04.2.8 | 5,000 hr | HOURS | 3,847.2 | 1,152.8 | ✅ WITHIN_LIMIT |
| 9 | Main Rotor Head Retention Bolts | S76-ALS-04.2.9 | 2,500 hr | HOURS | 1,847.2 | 652.8 | ⚠️ DUE_SOON |
| 10 | Main Rotor Dampeners (set of 4) | S76-ALS-04.2.10 | 2,200 hr | HOURS | 1,847.2 | 352.8 | ⚠️ DUE_SOON |

**Items 9 and 10 — DUE_SOON Flag:**

Main Rotor Head Retention Bolts (652.8 hr remaining): Within standard DUE_SOON threshold of 750 hours. Sandra confirmed hours from bolt installation records — new bolts installed at last hub overhaul (TT 2,275.5 hr, component time = 4,122.7 - 2,275.5 = 1,847.2 hr). Marcus reviewed: DUE_SOON state correct; no immediate action; schedule replacement within next 500 hours. Flag noted.

Main Rotor Dampeners (352.8 hr remaining): Within DUE_SOON threshold. Sandra confirmed dampener installation at same overhaul event (TT 2,275.5 hr). Marcus reviewed: 352 hours is tight — schedule dampener replacement at next major maintenance event, not to exceed 300 hours. Flag noted as priority DUE_SOON.

---

### 2.2 Tail Rotor System (6 items)

| # | Component | ICA Ref | Life Limit | Interval Type | Baseline Hours on Component | Hours Remaining | Status |
|---|---|---|---|---|---|---|---|
| 11 | Tail Rotor Hub Assembly | S76-ALS-04.3.1 | 5,000 hr | HOURS | 4,122.7 | 877.3 | ✅ WITHIN_LIMIT |
| 12 | Tail Rotor Blades (pair) | S76-ALS-04.3.2 | 4,000 hr or 12 yr | HOURS_OR_CALENDAR | 2,001.4 | 1,998.6 | ✅ WITHIN_LIMIT |
| 13 | Tail Rotor Pitch Change Links | S76-ALS-04.3.3 | 3,000 hr | HOURS | 1,203.4 | 1,796.6 | ✅ WITHIN_LIMIT |
| 14 | Tail Rotor Pitch Change Link Bearings | S76-ALS-04.3.4 | 3,000 hr | HOURS | 1,203.4 | 1,796.6 | ✅ WITHIN_LIMIT |
| 15 | Tail Rotor Drive Shaft — Forward Section | S76-ALS-04.3.5 | 3,500 hr | HOURS | 4,122.7 | (entire aircraft TT) — see note | ✅ WITHIN_LIMIT |
| 16 | Tail Rotor Drive Shaft — Aft Section | S76-ALS-04.3.6 | 3,500 hr | HOURS | 4,122.7 | (entire aircraft TT) — see note | ✅ WITHIN_LIMIT |

**Item 11 — Tail Rotor Hub:** Hours on component = aircraft total time (original installation). Sandra confirmed no tail rotor hub replacement in logs. Component time = 4,122.7 hr. Life limit 5,000 hr. 877.3 hours remaining. WITHIN_LIMIT but elevated — schedule is approaching.

**Items 15, 16 — Drive Shaft note:** Drive shaft component time = aircraft total time (no replacement in logs). Hours remaining = 3,500 - 4,122.7 = **NEGATIVE**. See Section 4 — Flags.

---

### 2.3 Drive System and Gearboxes (7 items)

| # | Component | ICA Ref | Life Limit | Interval Type | Baseline Hours on Component | Hours Remaining | Status |
|---|---|---|---|---|---|---|---|
| 17 | Main Gearbox (MGB) | S76-ALS-04.4.1 | 1,500 hr TBO | HOURS (overhaul) | 412.8 (since last overhaul) | 1,087.2 | ✅ WITHIN_LIMIT |
| 18 | Intermediate Gearbox (IGB) | S76-ALS-04.4.2 | 1,500 hr TBO | HOURS (overhaul) | 412.8 | 1,087.2 | ✅ WITHIN_LIMIT |
| 19 | Tail Rotor Gearbox (TGB) | S76-ALS-04.4.3 | 1,500 hr TBO | HOURS (overhaul) | 412.8 | 1,087.2 | ✅ WITHIN_LIMIT |
| 20 | Freewheeling Unit | S76-ALS-04.4.4 | 1,500 hr TBO | HOURS (overhaul) | 412.8 | 1,087.2 | ✅ WITHIN_LIMIT |
| 21 | Tail Rotor Hub Gearbox Input Shaft | S76-ALS-04.4.5 | 3,000 hr | HOURS | 4,122.7 | (entire aircraft TT) — see note | ✅ WITHIN_LIMIT |
| 22 | Main Rotor Shaft — Upper Bearing Race | S76-ALS-04.4.6 | 2,500 hr | HOURS | 1,847.2 | 652.8 | ⚠️ DUE_SOON |
| 23 | Hydraulic Actuator Life-Limited Seals | S76-ALS-04.4.7 | 2,000 hr or 10 yr | HOURS_OR_CALENDAR | 412.8 (since last scheduled replacement) | 1,587.2 | ✅ WITHIN_LIMIT |

**Items 17-20 — Gearboxes:** All four gearboxes/freewheeling unit were overhauled at the same maintenance event (Sandra confirmed from maintenance logs: MGB/IGB/TGB/FWU all overhauled at TT 3,709.9 hr). Component time since last overhaul = 4,122.7 - 3,709.9 = 412.8 hr. Life limit 1,500 hr TBO. 1,087.2 hr remaining. WITHIN_LIMIT.

**Item 21 — Hub Gearbox Input Shaft note:** No replacement recorded in logbooks. Component time = aircraft TT (4,122.7 hr). Life limit 3,000 hr — ALS item is at 3,000+ hours. See Section 4 — Flags.

**Item 22 — Main Rotor Shaft Upper Bearing Race:** Component time 1,847.2 hr (installed at hub overhaul, TT 2,275.5 hr). Life limit 2,500 hr. 652.8 hr remaining. DUE_SOON (same installation event as items 9 and 10).

---

### 2.4 Engine — Turbomeca Arriel 2S1 (both engines) (6 items)

*N76LS carries two Turbomeca Arriel 2S1 engines. Both engines are tracked as ALS items per dual-authority structure (S-76C ICA §04-50-00 references Turbomeca ICA as authoritative).*

*Both engines were overhauled at same maintenance event (TT 3,709.9 hr — same event as gearboxes). Engine component time since last overhaul: 412.8 hr.*

| # | Component | ICA Ref | Life Limit | Interval Type | Component Time | Hours Remaining | Status |
|---|---|---|---|---|---|---|---|
| 24 | Engine #1 — Arriel 2S1 Assembly (TBO) | S76-ALS-04.5.1 | 3,500 hr TBO | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |
| 25 | Engine #2 — Arriel 2S1 Assembly (TBO) | S76-ALS-04.5.2 | 3,500 hr TBO | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |
| 26 | Engine #1 — Gas Producer Module (N1 turbine wheel) | Turbomeca ICA §04 | 3,500 hr component life | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |
| 27 | Engine #2 — Gas Producer Module (N1 turbine wheel) | Turbomeca ICA §04 | 3,500 hr component life | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |
| 28 | Engine #1 — Power Turbine Module | Turbomeca ICA §04 | 3,500 hr component life | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |
| 29 | Engine #2 — Power Turbine Module | Turbomeca ICA §04 | 3,500 hr component life | HOURS | 412.8 | 3,087.2 | ✅ WITHIN_LIMIT |

All engine items are within limit; 3,087 hours remaining to next TBO/module life limit. Engine component times confirmed from last overhaul release documents (Turbomeca authorized facility, 2022).

---

### 2.5 Certification Maintenance Requirements — CMRs (4 items)

*CMRs tracked via `alsItems` with `complianceCategory: "CMR"` per v1.3 design.*

| # | CMR Ref | Description | Interval | Last Performed | Next Due | Status |
|---|---|---|---|---|---|---|
| 30 | CMR-04-70-001 | Engine fire detection system — loop continuity test | 600 hr | 2025-11-14 (TT 3,709.9 hr) | 4,309.9 hr | ✅ WITHIN_LIMIT |
| 31 | CMR-04-70-002 | Main rotor governor — droop limiting function test | Annual | 2025-11-14 (last annual) | 2026-11-14 | ✅ WITHIN_LIMIT |
| 32 | CMR-04-70-003 | Fuel boost pump — primary circuit functional check | 300 hr | 2025-11-14 (TT 3,709.9 hr) | 4,009.9 hr | ⚠️ DUE_SOON |
| 33 | CMR-04-70-004 | Hydraulic system — low-pressure warning functional test | 600 hr | 2025-11-14 (TT 3,709.9 hr) | 4,309.9 hr | ✅ WITHIN_LIMIT |

**CMR-32 — DUE_SOON Flag:**

Fuel boost pump primary circuit check is due at 4,009.9 hr (next due after last performance at 3,709.9 hr). Current TT is 4,122.7 hr. **Item is 112.8 hr past the 300-hr interval.** This is an **OVERDUE** item, not DUE_SOON.

*See Section 4 — Flags.*

---

## 3. Compliance State Summary

| Category | Total Items | WITHIN_LIMIT | DUE_SOON | OVERDUE |
|---|---|---|---|---|
| Main Rotor System | 10 | 8 | 2 | 0 |
| Tail Rotor System | 6 | 4 | 0 | 2* |
| Drive System / Gearboxes | 7 | 5 | 1 | 1* |
| Engine (Arriel 2S1) | 6 | 6 | 0 | 0 |
| CMRs | 4 | 3 | 0 | 1 |
| **Total** | **33** | **26** | **3** | **4*** |

*\* Items marked as OVERDUE/flagged — see Section 4 for detail. Several are data entry interpretation issues requiring resolution before final status is confirmed.*

---

## 4. Any Flags or Immediate Actions

Four items require resolution at this session before Sandra can sign off the data.

### 4.1 Flag 1 — Tail Rotor Drive Shaft Forward + Aft (Items 15, 16)

**Issue:** Component time = aircraft total time (4,122.7 hr). ALS life limit = 3,500 hr. Hours remaining = NEGATIVE (-622.7 hr). This would indicate these items are OVERDUE by 622.7 hours.

**Marcus's review:**

> "Before we flag this as OVERDUE, I want to confirm from the logbooks that the drive shaft sections have never been replaced. Sandra, does the logbook show original installation?"

**Sandra:**

> "Let me look. [Reviews logbooks for 8 minutes.] There's an entry at TT 2,891.4 hours — forward drive shaft section replacement per Sikorsky SB. The part number changed. Let me find the aft section. [Reviews.] Also at TT 2,891.4 — aft section also replaced in the same maintenance event. Same SB."

**Resolution:** Both drive shaft sections were replaced at TT 2,891.4 hr. Sandra entered the correct component time: 4,122.7 - 2,891.4 = **1,231.3 hours on component**. Hours remaining: 3,500 - 1,231.3 = **2,268.7 hours**. Status: **WITHIN_LIMIT**. ✅

**Lesson:** Drive shaft component time ≠ aircraft total time. Sandra was working from the initial template which defaulted to aircraft TT. The logbook review corrected it. Marcus noted: "This is exactly why the session requires physical logbook access. You cannot enter Part 29 ALS data from memory."

---

### 4.2 Flag 2 — Tail Rotor Hub Gearbox Input Shaft (Item 21)

**Issue:** Component time = aircraft total time (4,122.7 hr). Life limit = 3,000 hr. Apparent OVERDUE by 1,122.7 hr.

**Marcus's review:** Same question as Flag 1 — check for replacement entries.

**Sandra:** "Checking. [Reviews.] I see a note at TT 3,195.6 hr — tail rotor hub gearbox removal and rebuild at Sikorsky S-76C authorized facility. The input shaft is listed as replaced in the rebuild records. Part number updated."

**Resolution:** Input shaft replaced at TT 3,195.6 hr. Component time = 4,122.7 - 3,195.6 = **927.1 hours**. Hours remaining: 3,000 - 927.1 = **2,072.9 hours**. Status: **WITHIN_LIMIT**. ✅

---

### 4.3 Flag 3 — Tail Rotor Hub Assembly (Item 11)

**Status after Flags 1 and 2:** WITHIN_LIMIT (877.3 hr remaining to 5,000-hr life limit). Not a flag — Sandra was worried about this one before the session. After confirming component time = aircraft TT (original installation, no replacement found), it is 877.3 hours from retirement. Within limit.

**Marcus:** "877 hours to retirement is not immediate, but it means the tail rotor hub will need replacement in approximately the next 8-12 months of operation at typical utilization. Sandra, you should be budgeting for this. It's not a flag — it's planning context."

**Sandra entered WITHIN_LIMIT. Planning note recorded in item notes field.**

---

### 4.4 Flag 4 — CMR-04-70-003 Fuel Boost Pump Check (Item 32 — OVERDUE)

**Issue:** Last performed at TT 3,709.9 hr. 300-hr interval. Next due: 4,009.9 hr. Current TT: 4,122.7 hr. **Item is 112.8 hours past due.**

**Marcus:**

> "This is an actual OVERDUE item. A Certification Maintenance Requirement that has been exceeded. The fuel boost pump primary circuit check is a function test — it confirms the backup operability of the primary fuel boost circuit. It needs to be completed. This is not a cosmetic finding.
>
> Sandra, has the aircraft flown since TT 4,009.9 hr?"

**Sandra:**

> "Yes. We've flown approximately 112 hours since the check was due. I didn't know this was a 300-hour item — it wasn't on the schedule Marcus set up for us. This is exactly the gap the system is supposed to close."

**Marcus:**

> "Correct. The CMR wasn't in your prior tracking because Part 29 CMRs are a category that wasn't entered anywhere before today's session. The aircraft has flown 112 hours with an overdue CMR. This needs immediate corrective action.
>
> Corrective action: schedule the fuel boost pump primary circuit check at the next available maintenance event. Before then — I would not be comfortable with extended flight operations on N76LS without this check. Sandra, this item needs to be entered as OVERDUE in Athelon and a work order opened for the check."

**Action taken:**
- CMR-04-70-003 entered as **OVERDUE** in Athelon.
- DOM alert `CMR_OVERDUE` (red) fires automatically on entry.
- Sandra opened WO-LSR-CMR-001 immediately after the session: "N76LS — CMR-04-70-003 Fuel Boost Pump Primary Circuit Check — overdue 112.8 hr. Schedule completion before continued flight operations."
- Marcus issued a compliance advisory for N76LS: complete WO-LSR-CMR-001 before extended flight operations. Single-leg ferry flights to maintenance facility authorized at DOM discretion.

**Status: OVERDUE — WO-LSR-CMR-001 OPEN.**

---

### 4.5 Final Compliance State After Flag Resolution

| Category | Total | WITHIN_LIMIT | DUE_SOON | OVERDUE |
|---|---|---|---|---|
| Main Rotor System | 10 | 8 | 2 | 0 |
| Tail Rotor System | 6 | 6 | 0 | 0 |
| Drive System / Gearboxes | 7 | 6 | 1 | 0 |
| Engine (Arriel 2S1) | 6 | 6 | 0 | 0 |
| CMRs | 4 | 3 | 0 | 1 |
| **Total** | **33** | **29** | **3** | **1** |

**29 items WITHIN_LIMIT. 3 items DUE_SOON (schedule within next 300-500 hr). 1 item OVERDUE (CMR-04-70-003, WO open).**

---

## 5. Sandra Okafor Sign-Off

*Sandra Okafor, DOM — Lone Star Rotorcraft, Fort Worth TX.*

The session took longer than I expected — three hours and twenty minutes — but it was the right amount of time. The drive shaft and input shaft issues we found were real logbook interpretation questions, not data entry errors. Marcus was exactly right to ask me to verify each component time from the physical records rather than defaulting to aircraft total time.

The fuel boost pump CMR finding was a surprise to me. I didn't know N76LS had CMRs — I know the term but I didn't know what the specific items were or that they had their own intervals separate from the annual inspection cycle. That's the value of this session. We went through all 33 items, and now N76LS's compliance picture is in Athelon. The one OVERDUE item is already on a work order.

Marcus was right that this is the session we needed to do when v1.3 shipped. We didn't pre-load the data — we entered it with source documentation in hand. That's the right approach.

The ALS board for N76LS now shows the correct compliance state. I can see the three DUE_SOON items at the top of the board. I can see the CMR-04-70-003 item in red at the top of the CMR section. This is what I needed.

**Sandra Okafor — N76LS ALS Data Entry Sign-Off: ✅ SIGNED**
*All 33 S-76C ALS/CMR items entered. Data validated against physical logbooks.*
*1 OVERDUE item (CMR-04-70-003): WO-LSR-CMR-001 open. Corrective action in progress.*
*3 DUE_SOON items flagged for scheduling.*
*Lone Star Rotorcraft, Fort Worth TX — 2026-04-11*

**Marcus Webb — Data Entry Validation: ✅ VALIDATED**
*ALS item set consistent with WS27-B audit (33 items). Baseline hours verified against maintenance records. Flag resolutions confirmed correct. CMR-04-70-003 OVERDUE documented and corrective action initiated. N76LS compliance baseline is accurate.*
*2026-04-12*
