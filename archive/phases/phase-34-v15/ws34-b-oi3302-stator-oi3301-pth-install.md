# WS34-B — OI-33-02: N521HPA Engine 1 Power Turbine Stator Procurement + OI-33-01: N4421T PTH Parts Receipt & Pre-Installation Review
**Workstream:** WS34-B
**Phase:** 34 / v1.5
**Open Items:** OI-33-02 (N521HPA Stator — ACTIVE, advisory → PO); OI-33-01 (N4421T PTH — PARTS ORDERED → RECEIVED → PRE-INSTALL)
**Owners:** Marcus Webb (compliance review, both OIs); Lorena Vásquez (OI-33-02 procurement, HPAC); Curtis Pallant (OI-33-01 parts receipt, Ridgeline)
**Supporting:** Devraj Anand (ALS board updates)
**Timeline:** 2026-08-21 through 2026-09-25
**Status:** ✅ DONE — OI-33-02: PO issued, WO-HPAC-002 PARTS ORDERED; OI-33-01: Part received, 8130-3 verified, Marcus pre-installation sign-off issued

---

## §1. OI-33-02 — N521HPA Engine 1 Power Turbine Stator Procurement

### §1.1 Background and Finding

During the King Air B200 ALS activation at HPAC on 2026-08-08, Lorena Vásquez's line-by-line field validation of N521HPA's PT6A-42 engine logbooks surfaced a finding that had been buried in a service bulletin footnote in her spreadsheet for three years.

N521HPA is a 1988 Beechcraft King Air B200. Engine 1 (port, inboard): P&WC PT6A-42, S/N PCE-RB0742. During overhaul in 2020, the Power Turbine Stator was replaced under P&WC Service Bulletin SB1837. The SB1837 replacement part has a cycle life limit of **3,600 cycles from replacement date** — a non-standard limit that differs from the base engine configuration (which has no time/cycle limit on the original stator, only on-condition replacement). The replacement stator's life limit is tracked from the date of installation, not from original manufacture.

At the time of the ALS activation:
- **SB1837 replacement installation date:** 2020-04-17 (N521HPA Engine 1 major overhaul completion)
- **Cycles accumulated since SB1837 replacement:** 1,753 cycles
- **Life limit:** 3,600 cycles from installation
- **Remaining cycles:** 1,847 cycles
- **Current ALS status:** DUE_SOON (threshold: ≤2,500 cycles; ~2028-06 projected limit)

Lorena's spreadsheet had entered the stator under the base engine configuration — which had no life limit — and the SB1837 modification flag existed only as a text note in the "service history" column. The Athelon ALS template Marcus had seeded for the PT6A-42 included SB1837 applicability as a conditional item: if the engine's service history includes an SB1837-configured replacement, the cycle life limit applies. Marcus's Day 1 gap brief had flagged this as a data-entry risk. Lorena found it herself, during validation, before Marcus did.

Marcus opened OI-33-02 on 2026-08-08 at the close of the ALS activation session. By Phase 34 entry (2026-08-21), the item's status was ADVISORY ACTIVE — the ALS board was showing DUE_SOON, a procurement advisory had fired, and no formal compliance review or procurement action had yet been taken.

### §1.2 OI-33-02 — Formal Item Register

**OI Reference:** OI-33-02
**Opened:** 2026-08-08 (at King Air ALS activation)
**Aircraft:** N521HPA (King Air B200, HPAC, KPUB)
**Engine:** Engine 1 (port), P&WC PT6A-42, S/N PCE-RB0742
**Component:** Power Turbine Stator (SB1837 replacement configuration)
**ALS Item ID:** HPAC-K1-PTS-01
**Cycles accumulated (at entry):** 1,753 (from SB1837 replacement date 2020-04-17)
**Life limit:** 3,600 cycles from SB1837 replacement
**Remaining cycles at entry:** 1,847
**Projected limit date:** ~2028-06 (based on N521HPA ~70 cycles/month average)
**12-month procurement advisory trigger:** ~2027-06 (at ~1,050 cycles remaining)
**Current advisory trigger status:** ACTIVE — DUE_SOON threshold crossed at entry
**Note:** Life limit is SB1837-specific; ESN-conditional; does not apply to engines without SB1837 history
**Phase 34 action:** Marcus compliance review of rotable option; PO to be issued; WO-HPAC-002 opened

---

### §1.3 Marcus Compliance Review — Rotable Option (2026-08-21 through 2026-08-25)

**Compliance Memo: OI-33-02-COMP-001**
**Date:** 2026-08-25
**Author:** Marcus Webb
**Subject:** Rotable Power Turbine Stator — Compliance Determination (PT6A-42, SB1837 Configuration)
**Status:** ✅ APPROVED

---

*Background:* OI-33-02 involves a Power Turbine Stator installed under P&WC SB1837 on N521HPA Engine 1 (PT6A-42 S/N PCE-RB0742). The item has 1,847 cycles remaining before its mandatory retirement limit of 3,600 cycles from replacement date. HPAC's DOM Lorena Vásquez has asked whether a rotable (overhauled exchange) replacement is compliant for this item, following the same workflow used for the N4421T Power Turbine Inlet Housing (OI-33-01, Phase 33).

*Regulatory framework:*

The SB1837 replacement Power Turbine Stator is a life-limited part under the P&WC PT6A-42 Engine Maintenance Manual §05-10-00. As a life-limited rotable part, the controlling regulatory framework is:
- **14 CFR §43.13(a):** Work must be performed using methods, techniques, and practices described in the current manufacturer's maintenance manual or Instructions for Continued Airworthiness.
- **14 CFR §65.81 / §65.83:** Certificated mechanics must use approved data.
- **P&WC PT6A-42 EMM §05-10-00:** Mandatory retirement limits for life-limited parts (including SB1837-configured stator).
- **P&WC Service Agreement Requirements:** For overhauled parts from authorized facilities.

*Rotable compliance determination:*

A rotable (overhauled exchange) stator is compliant for this replacement IF the following conditions are met:

1. **Overhaul by an authorized P&WC facility:** The overhaul facility must hold a P&WC service agreement authorizing PT6A-series component overhaul.
2. **Life limit tracking from overhaul date:** The replacement rotable's life limit is tracked from the date of overhaul, not original manufacture. The remaining cycles on the rotable at installation become the aircraft's remaining cycles for that component. If a rotable has 2,100 cycles since overhaul at the time of installation into N521HPA, the ALS board should reflect 3,600 - 2,100 = 1,500 cycles remaining from installation.
3. **8130-3 FAA Airworthiness Approval Tag:** The overhauled rotable must be accompanied by an FAA Form 8130-3 issued by the overhaul facility, referencing the specific P/N and S/N, confirming zero-time-since-overhaul status, and identifying the overhaul standard applied.
4. **ALS board update at installation:** Athelon ALS board HPAC-K1-PTS-01 must be updated at installation to reflect the new rotable's S/N and the new cycle baseline (cycles since overhaul at installation = new starting point).

*Compliance determination:* **ROTABLE REPLACEMENT COMPLIANT** under the above conditions. This mirrors the compliance determination issued for OI-33-01 (N4421T Power Turbine Inlet Housing, memo filed Phase 33). The PT6A-42 stator is a different part type and engine series, but the compliance framework is identical.

*SB1837 configuration note:* Any replacement stator — rotable or new-manufacture — must be the SB1837 replacement configuration. The base stator (pre-SB1837) is NOT an acceptable replacement. The supplier must confirm that the replacement part is SB1837-compliant in writing, and the 8130-3 must reference the applicable service bulletin or AMM revision.

*ESN-conditional ALS note:* Following this procurement, Marcus will update the HPAC King Air B200 ALS template to explicitly mark the SB1837 Power Turbine Stator life limit as ESN-conditional. Any future field entry for a PT6A-42 engine that does not have SB1837 service history should not have this item on the ALS board. The conditional flag will prompt the data-entry operator to check service history before applying the life limit.

**Signed:** Marcus Webb, Compliance Lead — 2026-08-25

---

Marcus sent the memo to Lorena by email on 2026-08-25 and uploaded it to the WO-HPAC-002 compliance documentation folder. He called her to walk through the SB1837 rotable note specifically.

*"The rotable has to be SB1837 config — same part as what came out, functionally. If a supplier comes back with a standard pre-SB1837 stator at a lower price, that's not compliant for this engine. Make sure you confirm the SB applicability before you commit to a supplier."*

Lorena: *"Already on my list. I called Western Turbine this morning before your memo arrived. They knew the SB1837 reference before I finished the question."*

Marcus: *"Good. That tells you something about the supplier."*

---

### §1.4 WO-HPAC-002 Opened (2026-08-25)

Lorena opened WO-HPAC-002 on 2026-08-25 after receiving Marcus's compliance memo. Work order type: **Procurement** (ALS-triggered). Associated ALS item: HPAC-K1-PTS-01. Status at opening: **OPEN — PROCUREMENT IN PROGRESS**.

**WO-HPAC-002 fields at opening:**
- Aircraft: N521HPA
- Engine: Engine 1, PT6A-42 S/N PCE-RB0742
- Component: Power Turbine Stator (SB1837 configuration)
- ALS remaining: 1,847 cycles
- Projected replacement: ~2028-06
- Compliance memo: OI-33-02-COMP-001 (filed)
- Procurement status: IN PROGRESS

### §1.5 Supplier Research and Quote Comparison (2026-08-25 through 2026-09-02)

Lorena contacted three suppliers for the PT6A-42 Power Turbine Stator in SB1837 configuration:

**Supplier 1 — Western Turbine Services (Reno NV)**
- Contact: David Park, Parts Manager
- Initial call: 2026-08-25
- P/N quoted: PT6A-42 Power Turbine Stator SB1837 config (P/N 3027842-01 per SB1837 amendment)
- Status: Rotable available, 312 cycles since overhaul, overhaul date 2025-11-12
- Overhaul facility: Western Turbine Services Inc. (P&WC service agreement PA-4471)
- 8130-3: Available
- Price: Exchange $14,200 + $8,500 core (core refund upon serviceable return of old part)
- Lead time: In stock, 3 business days ship
- SB1837 confirmation: Yes, in writing, referenced on invoice and 8130-3
- Quote date: 2026-08-26

**Supplier 2 — Pacific Turbine Parts (Burbank CA)**
- Contact: Angela Simmons, King Air parts specialist (same contact used for OI-33-01 PTH)
- Initial call: 2026-08-26
- P/N quoted: Same SB1837 config
- Status: Rotable available, 0 cycles since overhaul, overhaul date 2026-07-30
- Overhaul facility: Pacific Turbine Parts Overhaul Division (P&WC service agreement PA-2994)
- 8130-3: Available; 0 SMOH
- Price: Exchange $15,400 + $8,500 core
- Lead time: 3-4 business days ship
- SB1837 confirmation: Yes, in writing; overhaul performed to SB1837 amendment rev 3
- Quote date: 2026-08-27

**Supplier 3 — Air Industries Group Turbine Parts (Dallas TX)**
- Contact: Vendor contacted; no response within quote window
- Quote date: N/A — removed from consideration 2026-09-02

**Quote summary table entered in WO-HPAC-002 Notes:**

| Supplier | SMOH | 8130-3 | P&WC Agmt | Price (exchange) | Lead time |
|---|---|---|---|---|---|
| Western Turbine Services (Reno) | 312 | ✅ | PA-4471 | $14,200 + $8,500 core | 3 days |
| Pacific Turbine Parts (Burbank) | 0 | ✅ | PA-2994 | $15,400 + $8,500 core | 3–4 days |

### §1.6 Marcus Quote Review and Supplier Approval (2026-09-03)

Lorena forwarded both quotes to Marcus on 2026-09-02. Marcus reviewed them on 2026-09-03.

**Marcus's assessment:**

*Pacific Turbine Parts — Western Turbine Services comparison (OI-33-02-COMP-001 addendum):*

Both suppliers are compliant. The compliance differentiators:
- Pacific Turbine Parts: 0 cycles since overhaul (freshest possible rotable); PA-2994 is the same P&WC service agreement used for OI-33-01 — already vetted by Marcus. Price premium ~$1,200 over Western Turbine.
- Western Turbine Services: 312 SMOH (still within useful life for planning — 3,600 - 312 = 3,288 remaining at installation). PA-4471 service agreement — not previously evaluated, but P&WC's published service agreement directory confirms current status.

From a compliance standpoint, both are acceptable. From a planning standpoint, the Pacific Turbine Parts option provides a longer remaining life (effectively 3,600 cycles from installation for a 0-SMOH unit vs. approximately 3,288 for the Western unit). For a King Air B200 operating at ~70 cycles/month, the additional 312 cycles is approximately 4.5 months of additional useful life before the next replacement window opens. At $1,200 premium, the cost per cycle difference is negligible.

**Marcus recommendation:** *Pacific Turbine Parts preferred for life planning and established vendor vetting. Either is compliant. DOM's call on price.*

Marcus sent the analysis to Lorena on 2026-09-03.

Lorena's response: *"Pacific Turbine it is. I'd rather have the full 0-SMOH unit. The $1,200 saves me a conversation in two years."*

Marcus signed off on Pacific Turbine Parts as the selected supplier: **OI-33-02 supplier approved — Pacific Turbine Parts, PA-2994, 0 SMOH, 8130-3. — M. Webb, 2026-09-03.**

### §1.7 Purchase Order Issued (2026-09-05)

**PO Issued:** PO-HPAC-002-A
**Date:** 2026-09-05
**Supplier:** Pacific Turbine Parts (Burbank CA)
**Part:** Power Turbine Stator, P/N 3027842-01 (SB1837 configuration), PT6A-42
**S/N:** PTP-PTSA-40882 (S/N at 0 SMOH; PTP internal reference)
**Unit price:** $15,400 exchange (+ $8,500 core deposit, refundable on serviceable core return)
**Expected delivery:** 2026-09-12 to 2026-09-15

Lorena entered the PO details in WO-HPAC-002 using the procurement workflow status subfields (note: v1.5.0-sprint2 had not yet shipped as of PO date — these fields were entered manually in the WO notes pending Sprint 2 deployment):

> *"PO-HPAC-002-A issued 2026-09-05. Supplier: Pacific Turbine Parts. Part: PT Stator P/N 3027842-01 SB1837 config, 0 SMOH, 8130-3 expected. Delivery 2026-09-12 to 09-15. Core deposit $8,500 will be held pending serviceable return of PTS S/N PCE-RB0742-S-001 (old unit). — L. Vásquez, 2026-09-05"*

WO-HPAC-002 status update: **OPEN** → **PARTS ORDERED**

Devraj Anand updated the Athelon ALS board for HPAC-K1-PTS-01 to reflect the new procurement tracking note: *"Procurement active. PO-HPAC-002-A issued 2026-09-05. Pacific Turbine Parts. Expected delivery 2026-09-12 to 09-15."*

**OI-33-02 Phase 34 milestone: ✅ COMPLETE — Marcus compliance memo filed; PO issued; WO-HPAC-002 PARTS ORDERED.**

*(Note: Part receipt, installation, and ALS board reset tracking will follow in Phase 35 as part of the continued OI-33-02 lifecycle. The Phase 34 OI-33-02 scope was advisory → PO issued, per WS34 plan §3.2.)*

---

## §2. OI-33-01 — N4421T PTH Parts Receipt and Pre-Installation Review

### §2.1 Background: Where OI-33-01 Stands at Phase 34 Entry

OI-33-01 entered Phase 34 as the most mature open item in the network. By 2026-08-21:
- The formal ALS audit (OI-32-02) had been completed in June 2026
- The procurement advisory had fired on 2026-08-01 as predicted
- Marcus's compliance review of the rotable PTH option had been completed (Phase 33, memo filed 2026-08-07)
- PO-RDG-PTH-001 had been issued to Pacific Turbine Parts on 2026-08-10
- WO-RDG-003 was open, status: PARTS ORDERED
- Expected delivery: 2026-09-15 to 2026-09-22
- Installation target: N4421T 200-hr inspection, 2026-10-01

Phase 34's scope for OI-33-01: part receipt, 8130-3 verification, parts receiving log entry, and Marcus pre-installation review — the final compliance clearance before Curtis Pallant schedules the installation.

### §2.2 Part Delivery — Pacific Turbine Parts (2026-09-18)

The overhauled Power Turbine Inlet Housing arrived at Ridgeline Air Maintenance (KRTS, Reno-Stead NV) on 2026-09-18 — three days after the early end of the delivery window, within the 2026-09-22 outer bound.

**Delivery details:**
- **Part:** Power Turbine Inlet Housing, P&WC PT6A-66D, P/N 3053174
- **S/N:** PTP-PTH-20244 (Pacific Turbine Parts overhaul serial)
- **Overhaul date:** 2026-07-22
- **Cycles since overhaul at delivery:** 0 (shipped directly from overhaul; no interim use)
- **Overhaul facility:** Pacific Turbine Parts Overhaul Division, Burbank CA
- **P&WC service agreement:** PA-2994 (active, confirmed by Marcus Phase 33)
- **Carrier:** Pacific Turbine Parts in-house freight
- **Condition of packaging:** Excellent; no external damage; proper humidity/pressure packaging per P&WC shipping standards
- **8130-3:** Present, signed by Authorized Release Certificate holder at PTP OD

Curtis Pallant received the shipment personally. He later described it to Devraj as follows:

*"It came in the white foam-lined case. I pulled it out and looked at the 8130-3 first — before I even looked at the part itself. That's what Marcus told us to do."*

Devraj, relaying this to Nadia: *"He said it like a quiz question he'd studied for."*

### §2.3 Incoming Parts Inspection and Receiving Log

Curtis Pallant performed the incoming inspection per Ridgeline's parts receiving protocol (RMTS standard, adapted from P&WC incoming inspection requirements, formalized in Phase 30 WO-RMTS-002 closure).

**Incoming Inspection Checklist — PO-RDG-PTH-001:**

| Check | Result | Notes |
|---|---|---|
| P/N matches PO | ✅ PASS | P/N 3053174 — correct |
| S/N documented | ✅ PASS | S/N PTP-PTH-20244 recorded |
| Overhaul facility | ✅ PASS | Pacific Turbine Parts OD, Burbank CA (P&WC PA-2994) |
| Overhaul date | ✅ PASS | 2026-07-22 |
| Cycles since overhaul | ✅ PASS | 0 (confirmed on 8130-3) |
| 8130-3 present and legible | ✅ PASS | Block 11 (Maintenance Release) — complete; ARC holder signature present |
| 8130-3 references correct P/N | ✅ PASS | P/N 3053174 — matches |
| 8130-3 references P&WC EMM revision | ✅ PASS | "Overhauled per P&WC PT6A-66D EMM Rev 28, §72-00-00" |
| Packaging integrity | ✅ PASS | No damage, humidity indicator nominal |
| Physical condition of part | ✅ PASS | No visible damage, corrosion, or improper rework evident; sealing surfaces pristine |
| Paperwork kit complete | ✅ PASS | 8130-3, test records (flow test PASS), overhaul work order copy included |

All checks passed. Curtis photographed the 8130-3 with his phone, then opened Athelon on the parts receiving screen.

He entered:
- Work order: WO-RDG-003
- Part: Power Turbine Inlet Housing, P/N 3053174, S/N PTP-PTH-20244
- Overhaul date: 2026-07-22
- SMOH: 0
- 8130-3 status: RECEIVED
- Supplier: Pacific Turbine Parts, PO-RDG-PTH-001
- Receipt date: 2026-09-18
- Attached: 8130-3 scan (photo upload)

*(Note: This was one of the first parts-receiving entries made under the new F-1.5-C Procurement Workflow Status Subfields — v1.5.0-sprint2 had shipped to all shops on 2026-09-19. Curtis was using the new procurement subfield interface on the day of sprint deployment. He did not notice the UI had changed until Devraj pointed it out. "I thought it always looked like that," Curtis said. Devraj took that as a compliment.)*

**WO-RDG-003 procurement status field update (via F-1.5-C):**
```
poNumber:         PO-RDG-PTH-001
supplierName:     Pacific Turbine Parts
expectedDelivery: 2026-09-22
8130-3Status:     RECEIVED → VERIFIED (after Marcus review)
deliveryNotes:    "0 SMOH. 8130-3 PA-2994. Received 2026-09-18 at KRTS. CPC inspection PASS."
```

### §2.4 Marcus Pre-Installation Review (2026-09-19 through 2026-09-22)

Curtis sent the 8130-3 scan and inspection checklist to Marcus on 2026-09-18 (same day as receipt). Marcus reviewed the documentation over the following two business days.

**Pre-Installation Review: OI-33-01-PRE-INSTALL-001**
**Date:** 2026-09-22
**Author:** Marcus Webb
**Subject:** Pre-Installation Compliance Review — N4421T Power Turbine Inlet Housing (P/N 3053174, S/N PTP-PTH-20244)

---

*Review scope:* This review confirms that the overhauled PTH received at Ridgeline Air Maintenance (PO-RDG-PTH-001, Pacific Turbine Parts) is compliant for installation in N4421T (TBM 850, PT6A-66D S/N PCE-RB0449) per the terms of the rotable compliance determination filed in Phase 33 (OI-33-01-COMP-001).

*Checklist:*

| Review item | Result |
|---|---|
| P/N matches required P/N per P&WC PT6A-66D EMM | ✅ PASS — P/N 3053174 |
| 8130-3 issued by authorized facility (P&WC PA-2994) | ✅ PASS |
| Overhaul standard per EMM | ✅ PASS — "Overhauled per P&WC PT6A-66D EMM Rev 28" |
| SMOH at receipt: 0 | ✅ PASS |
| ALS life limit from overhaul: 12,500 cycles from 2026-07-22 | ✅ CONFIRMED — 12,500 cycles remaining at installation |
| No open P&WC SBs affecting this P/N that require pre-installation action | ✅ PASS — SB review performed; no pre-installation SB action required |
| Physical condition (per CPC inspection report) | ✅ PASS |
| Part cleared for installation? | ✅ YES |

*ALS board update instruction for installation (per installation planning):*
- At installation, Athelon ALS board PTH-01 counter resets to 0 cycles SMOH
- New life limit: 12,500 cycles from installation date (2026-10-01 estimated)
- Old PTH unit (P/N 3053174, S/N original, 10,347+ accumulated cycles) retired from service
- Curtis Pallant (DOM) to confirm installation date and reset trigger in Athelon at installation

*Pre-installation compliance clearance:* ✅ **ISSUED**

**Signed:** Marcus Webb, Compliance Lead — 2026-09-22

---

Marcus updated WO-RDG-003's 8130-3 status field to **VERIFIED**. He sent the pre-installation clearance document to Curtis and noted the installation target of 2026-10-01.

Curtis's response: *"We're scheduled. N4421T's 200-hr is still on the books for October 1. Part is on the shelf, tagged, 8130-3 in the folder. I'll update the WO when we pull the engine."*

Marcus: *"Make sure you capture the installation date exactly. The new life limit clock starts on the day of installation, not the overhaul date."*

Curtis: *"Already in my notes."*

### §2.5 OI-33-01 Phase 34 Milestone Summary

**Phase 34 scope for OI-33-01:** Part receipt through Marcus pre-installation sign-off.

| Milestone | Date | Status |
|---|---|---|
| Part delivery from Pacific Turbine Parts | 2026-09-18 | ✅ COMPLETE |
| Curtis incoming inspection (all checks PASS) | 2026-09-18 | ✅ COMPLETE |
| Parts receiving log entry in Athelon (WO-RDG-003) | 2026-09-18 | ✅ COMPLETE |
| 8130-3 uploaded and filed | 2026-09-18 | ✅ COMPLETE |
| Marcus pre-installation review | 2026-09-19–22 | ✅ COMPLETE |
| Pre-installation compliance clearance issued | 2026-09-22 | ✅ COMPLETE |
| WO-RDG-003 8130-3Status → VERIFIED | 2026-09-22 | ✅ COMPLETE |
| Installation target confirmed | 2026-10-01 | ✅ SCHEDULED |

**OI-33-01 Phase 34 scope: ✅ COMPLETE.**

*(Installation and ALS board reset will be captured in Phase 35 at the 2026-10-01 installation event. The part is on the shelf at KRTS, cleared, scheduled.)*

---

## §3. Platform Observation: Two Procurement Cycles Running in Parallel

Phase 34 was the first phase in which two separate turbine life-limited part procurement cycles were active simultaneously at two different shops. OI-33-01 (N4421T PTH at Ridgeline, KRTS) and OI-33-02 (N521HPA Stator at HPAC, KPUB) overlapped through September 2026. Marcus was managing compliance review for both. Curtis and Lorena were managing procurement at their respective shops.

Devraj noted in the v1.5 Sprint 2 planning thread that this parallelism is exactly what the Procurement Workflow Status Subfields feature (F-1.5-C) was designed to support:

> *"When we had one life-limited part procurement (OI-33-01), Curtis used WO notes for tracking. It worked because it was one item at one shop. Now we have two items at two shops, both with Marcus doing compliance review, both sourcing from Pacific Turbine Parts. If we had three or four shops each with multiple DUE_SOON turbine parts, the free-text approach collapses. F-1.5-C gives Marcus a structured view across all procurement-type WOs without relying on everyone using the same note format."*

Lorena, when she saw the F-1.5-C fields live for the first time after Sprint 2 shipped (2026-09-19), sent a message to Nadia: *"This is what I was going to ask about in October. The PO number field, the expected delivery field — I've been typing this into notes. Why did it take until Sprint 2?"*

Nadia: *"Because Curtis found the gap in Phase 33. You confirmed it in Phase 34. That's usually how the features get built."*

---

## §4. OI Status Summary at WS34-B Completion

### OI-33-02 Status at WS34-B Close:
- **Status:** OPEN — PARTS ORDERED
- **WO:** WO-HPAC-002
- **PO:** PO-HPAC-002-A (Pacific Turbine Parts, $15,400 exchange)
- **Part:** PT Stator P/N 3027842-01 (SB1837 config), 0 SMOH, 8130-3 expected
- **Expected delivery:** 2026-09-12 to 09-15 → delivery confirmed 2026-09-13 (within window; receipt logging Phase 35)
- **Compliance memo:** OI-33-02-COMP-001 (filed 2026-08-25) ✅
- **Marcus approval:** ✅

### OI-33-01 Status at WS34-B Close:
- **Status:** OPEN — PRE-INSTALLATION (part received, pre-install clearance issued)
- **WO:** WO-RDG-003
- **Part on hand:** P/N 3053174, S/N PTP-PTH-20244, 0 SMOH, at KRTS
- **8130-3 status:** VERIFIED
- **Marcus pre-installation clearance:** ✅ ISSUED (2026-09-22)
- **Installation target:** 2026-10-01 (N4421T 200-hr inspection)
- **ALS board PTH-01 reset:** Pending installation date

---

## §5. Compliance Receipts

**OI-33-02-COMP-001 (Marcus Webb, 2026-08-25):** Rotable Power Turbine Stator (PT6A-42, SB1837 config) procurement — APPROVED. Rotable replacement compliant under conditions stated.

**OI-33-02 Supplier approval (Marcus Webb, 2026-09-03):** Pacific Turbine Parts selected — APPROVED.

**OI-33-01-PRE-INSTALL-001 (Marcus Webb, 2026-09-22):** Pre-installation compliance review for P/N 3053174 S/N PTP-PTH-20244 — ISSUED. Part cleared for installation in N4421T on 2026-10-01.

**Cilla Oduya QA review (2026-09-23):**
> *"OI-33-02 and OI-33-01 Phase 34 actions reviewed. Compliance memos present and signed. Parts receiving log complete for OI-33-01. ALS board updates reflect current OI status. Both OIs conform to the rotable procurement workflow established in Phase 33. No QA flags. — C. Oduya, QA Lead, 2026-09-23"*

---

*WS34-B complete. OI-33-02: PO-HPAC-002-A issued; WO-HPAC-002 PARTS ORDERED; Marcus compliance memo and supplier approval on file. OI-33-01: Part received at KRTS 2026-09-18; 8130-3 verified; Marcus pre-installation clearance issued 2026-09-22; installation target 2026-10-01 confirmed.*
