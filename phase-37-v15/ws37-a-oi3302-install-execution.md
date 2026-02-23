# WS37-A — OI-33-02 Installation Execution + Closure (N521HPA)
**Phase:** 37
**Status:** ✅ DONE
**Dates:** 2026-11-29 through 2026-12-08
**Owners:** Lorena Vásquez (DOM/IA, HPAC) · Marcus Webb (Compliance) · Nadia Solis (PM oversight)
**Aircraft:** N521HPA — King Air B200, Engines: P&WC PT6A-42, S/N PCE-PF0184 (Engine 1)
**Work Order:** WO-HPAC-002
**Open Item:** OI-33-02 — Engine 1 Power Turbine Stator, SB1837 replacement configuration

---

## 1) Pre-Installation Status Summary

At the close of Phase 36, the following had been confirmed:

| Item | Status |
|---|---|
| OI-33-02 advisory opened | 2026-08-08 (HPAC Day 1 ALS board activation) |
| Marcus compliance memo OI-33-02-COMP-001 | Issued 2026-08-25 |
| Vendor: Pacific Turbine Parts | Approved — PA-2994 (0 SMOH, 8130-3 available) |
| PO-HPAC-002-A issued | 2026-09-05 |
| WO-HPAC-002 status | PARTS ORDERED |
| Exchange unit received at KPUB | 2026-11-10 |
| Incoming inspection (Lorena Vásquez) | 2026-11-12 — PASS |
| Pre-installation compliance review | Lorena + Marcus — issued 2026-11-18 |
| Installation window (Phase 36 plan) | 2026-11-28 to 2026-12-12 |
| Installation cycle trigger | 1,847 cycles remaining at advisory; ~1,200 remaining at Phase 37 start — **within planned window** |

**Exchange unit received:**
- P/N: PT6A-42-PTS-SB1837
- S/N: PTP-PTS-20261
- TSO (Time Since Overhaul): 0 cycles
- 8130-3: uploaded to WO-HPAC-002 — FAA Form 8130-3 dated 2026-10-28, Pacific Turbine Parts, Release to Service Block 19 signed
- Configuration: SB1837 compliant — confirmed by Marcus in memo OI-33-02-COMP-001

---

## 2) Installation Execution Record

**Work Order:** WO-HPAC-002
**WO Type:** Scheduled Life-Limited Part Replacement (Power Turbine Stator, Engine 1)
**Aircraft:** N521HPA, King Air B200, S/N BB-1219
**Engine 1 ESN:** PCE-PF0184
**Location:** High Plains Aero & Charter, KPUB (Pueblo Memorial Airport, CO)
**Date range:** 2026-11-29 through 2026-12-05 (actual execution)
**Mechanic performing:** Lorena Vásquez, A&P/IA certificate CO-IA-7745
**Technical reviewer:** Marcus Webb (Athelon Compliance Director, remote review)

---

### 2.1 Pre-Work Checklist (2026-11-29)

Lorena completed the WO-HPAC-002 pre-close checklist before opening the engine. Items reviewed:

- [x] Approved data confirmed: P&WC PT6A-42 Maintenance Manual, Section 72-40-02 (Power Turbine Stator Removal/Installation)
- [x] 8130-3 on file and part identity verified against WO BOM: S/N PTP-PTS-20261 — MATCH
- [x] P/N verified against AMM and SB1837 compliance matrix — COMPLIANT
- [x] Tooling requirements: special torque wrench PT-0512A on hand; borescope ready for post-install inspection
- [x] Pre-existing squawks reviewed: none on Engine 1 open at time of installation
- [x] N521HPA logbooks pulled: current Engine 1 cycles: **11,497** (ALS board aligned)
- [x] Core exchange logistics confirmed with Pacific Turbine Parts — shipping label and core return address on file
- [x] ESN-conditional SB1837 flag in Athelon ALS template reviewed and confirmed applicable to PCE-PF0184

---

### 2.2 Engine Access + Removal (2026-11-29 to 2026-11-30)

**Tech:** Lorena Vásquez (primary). Raul Montoya (shop A&P, HPAC) assisting.

- Engine cowl panels removed per AMM Chapter 71-10-01
- Engine air inlet screen removed
- Compressor air bleed ducting disconnected
- Power turbine section accessed per AMM 72-40-01 access sequence
- Existing stator P/N verified at removal: P/N PT6A-42-PTS-SB1721 (pre-SB1837 configuration) — confirmed to be the unit documented in OI-33-02 advisory
- Outgoing stator photographed and tagged for core return
- Stator removed with no incidental damage to turbine shroud or adjacent hardware; adjacent labyrinth seal condition inspected and found serviceable (no replacement required)

**Finding at removal:** Lorena noted minor carbon deposit on the outgoing stator's leading edge, consistent with the aircraft's operational profile and age. No indication of structural distress or accelerated wear. Documented in WO-HPAC-002 findings section. No additional action required.

---

### 2.3 Installation of Exchange Unit (2026-12-01 to 2026-12-02)

- Exchange unit PT6A-42-PTS-SB1837 / S/N PTP-PTS-20261 removed from sealed packaging in Lorena's presence
- Final P/N + S/N visual check vs. 8130-3 — CONFIRMED MATCH
- Stator installed per AMM 72-40-02:
  - Alignment slots confirmed seating correctly
  - Lockwire installed per AMM torque/safety diagram
  - Torque wrench PT-0512A used; all fasteners torqued to specification (72 in-lb per AMM table 72-40-02-T01)
  - Torque seal (yellow) applied to all lockplate fasteners per shop practice
- Raul Montoya performed independent verification of torque seal application and lockwire routing

---

### 2.4 Borescope Inspection + Engine Close-Up (2026-12-02)

Per PROTO-WFAS-001 / PROTO-RMTS-001 (PT6A-114A base template) — Lorena adapted the established borescope protocol to PT6A-42 specifications per AMM 72-00-00 Borescope section:

- Borescope performed through Port 4 (power turbine section, high-pressure turbine blade ring)
- Findings: **SERVICEABLE** — no FOD, no erosion, no contact marks on shroud from newly installed stator, no seal wear abnormality
- Borescope photos uploaded to WO-HPAC-002 attachments (12 images, timestamped 2026-12-02T09:44 through 09:58 MST)
- Engine close-up per AMM 72-00-00 close-up procedure
- All cowl panels and access hardware reinstalled and verified

---

### 2.5 Engine Run-Up (2026-12-03)

**Location:** HPAC ramp, KPUB (winds 220° at 9 kts; OAT +4°C)
**Performed by:** Lorena Vásquez (left seat), Raul Montoya (right seat observer/reader)

Run profile:
| Phase | Parameter | Result |
|---|---|---|
| Ground start | IGT during start | 702°C peak — within limit (870°C red line) |
| Ground idle | Engine 1 Ng% | 60.3% — normal |
| Ground idle | Engine 1 Np% | N/A (prop feathered) |
| Acceleration to flight idle | ITT at flight idle | 648°C — normal |
| Power check (takeoff setting 30 sec) | Torque/ITT | 39 PSI / 800°C — within limits |
| Decel to ground idle | Time to idle | 3.2 seconds — normal |
| Shutdown | Normal sequence | Confirmed |

No anomalies observed. Oil pressure, oil temperature, and fuel flow all within normal operating ranges throughout. No vibration noted by Lorena or Raul during run-up.

**Run-up result: PASS**

---

### 2.6 Post-Run Inspection (2026-12-03 post-run)

- Engine cowl opened after 30-minute cool-down
- Visual inspection of new stator visible surfaces: no distress, no unusual discoloration
- Oil filler cap, oil servicing caps, and all quick-access panels secured
- No leaks detected at any fastener or seal
- Cowl closed and latched; safety pins removed and counted (all accounted for)

---

## 3) ALS Record Update

**Action performed by:** Lorena Vásquez in Athelon platform, 2026-12-03 18:14 MST
**Reviewed by:** Marcus Webb (remote) — compliance review completed 2026-12-04

| ALS Item | Before | After |
|---|---|---|
| Power Turbine Stator — Engine 1 (SB1837 config) | ACCUMULATED: 11,497 cycles; LIMIT: 12,500 cycles; STATUS: DUE_SOON → PLANNED REPLACEMENT | ACCUMULATED: **0 cycles (reset — new rotable installed)**; LIMIT: 12,500 cycles; STATUS: **COMPLIANT** |

**ALS board cycle count at installation:** 11,497 cycles (confirmed against logbook before installation)
**Exchange unit TSO at installation:** 0 cycles (new overhaul)
**New ALS limit (from installation):** 12,500 cycles (per P&WC PT6A-42 Engine Manual, life limit table)

---

## 4) Core Return Execution

| Event | Date | Notes |
|---|---|---|
| Outgoing stator tagged and packaged | 2026-12-03 | Per Pacific Turbine Parts core return instructions |
| Core shipped via FedEx freight (tracking: 7491-0052-3344) | 2026-12-04 | Lorena dropped at KPUB cargo facility |
| Estimated delivery to Pacific Turbine Parts (Mojave CA) | 2026-12-06 | |
| Core receipt confirmed by Pacific Turbine Parts | 2026-12-07 | Email confirmation to Lorena + WO-HPAC-002 notes |
| Core credit amount | $6,800 (per PO-HPAC-002-A terms) | Credit issued against HPAC account |
| Core credit posted | 2026-12-08 | Pacific Turbine Parts invoice adjusted — confirmed |

**R-37-01 (core credit slippage risk): RESOLVED.** Core received and credit confirmed within Phase 37 timeline.

---

## 5) Logbook Entries

**Aircraft Logbook Entry — N521HPA:**

> 2026-12-03 — N521HPA — King Air B200 S/N BB-1219
> Engine 1 (P&WC PT6A-42, ESN PCE-PF0184): Power Turbine Stator removed and replaced per WO-HPAC-002 in compliance with P&WC PT6A-42 Maintenance Manual 72-40-02 and Service Bulletin SB1837. Removed stator P/N PT6A-42-PTS-SB1721 (pre-SB1837). Installed rotable exchange stator P/N PT6A-42-PTS-SB1837, S/N PTP-PTS-20261, TSO 0 cycles, supplied under Pacific Turbine Parts service agreement PA-2994. 8130-3 on file. Post-installation borescope SERVICEABLE. Engine run-up conducted — all parameters within limits. No anomalies. Aircraft returned to service.
>
> Lorena Vásquez, A&P/IA CO-IA-7745
> HPAC — High Plains Aero & Charter, KPUB

**Engine Log Entry — PCE-PF0184:**

> 2026-12-03 — Power Turbine Stator replaced at Engine 1 TSMOH: 3,214 cycles / 4,827 hours. See N521HPA Aircraft Logbook entry 2026-12-03 for full record. ALS cycle counter reset to 0 per WO-HPAC-002.
>
> Lorena Vásquez, A&P/IA CO-IA-7745

---

## 6) Compliance Review — Marcus Webb

**Review date:** 2026-12-04
**Reference:** OI-33-02-COMP-001 (original compliance memo, 2026-08-25)
**Review outcome:** ✅ APPROVED

Marcus's review confirmed:

- 8130-3 on file, block 19 signed — CONFIRMED
- Part P/N and S/N match ALS board entry — CONFIRMED
- SB1837 configuration verified at installation (physical inspection finding matches memo requirement) — CONFIRMED
- Torque values per AMM — documented in WO-HPAC-002 step records — CONFIRMED
- Borescope post-inspection documented with photos — CONFIRMED
- Engine run-up completed with no anomalies — CONFIRMED
- ALS counter reset accurately — CONFIRMED (0 cycles from installation date; limit 12,500 cycles)
- Logbook entries completed and accurate — CONFIRMED

**Marcus's note (2026-12-04):**
> "OI-33-02 is closed. Lorena ran a clean work order — the pre-close checklist did exactly what it's designed to do. This is the first turbine stator replacement in the Athelon network, and the documentation package is complete. Core credit confirmed. No open items remaining."

---

## 7) OI-33-02 Formal Closure

**Open Item:** OI-33-02 — N521HPA Engine 1 Power Turbine Stator (SB1837 replacement configuration)
**Opened:** 2026-08-08 (HPAC King Air B200 ALS board activation)
**Advisory type:** Life-limited part replacement with SB configuration compliance requirement
**Closed:** **2026-12-04**
**Closure authority:** Lorena Vásquez (installation) + Marcus Webb (compliance review)
**WO:** WO-HPAC-002 — CLOSED

**OI-33-02 STATUS: ✅ CLOSED**

Timeline summary:
| Milestone | Date |
|---|---|
| Advisory opened (ALS board activation) | 2026-08-08 |
| Marcus compliance memo issued | 2026-08-25 |
| Vendor approved, PO issued | 2026-09-05 |
| Exchange unit received at KPUB | 2026-11-10 |
| Incoming inspection PASS | 2026-11-12 |
| Pre-installation compliance review issued | 2026-11-18 |
| Installation performed | 2026-11-29 — 2026-12-03 |
| Engine run-up PASS | 2026-12-03 |
| Marcus compliance review APPROVED | 2026-12-04 |
| OI-33-02 CLOSED | 2026-12-04 |
| Core shipped | 2026-12-04 |
| Core credit confirmed | 2026-12-08 |
| **Total advisory-to-closure duration** | **~118 days** |

---

## 8) Nadia PM Close-Out (2026-12-08)

Nadia Solis reviewed WS37-A on 2026-12-08 and recorded:

> "WO-HPAC-002 closed clean. OI-33-02 closure is the first power turbine stator replacement in the Athelon network and the longest OI arc since OI-33-01 (PTH at Ridgeline). Lorena ran the job herself as DOM/IA, Raul supported, Marcus reviewed — exactly the pattern the platform was designed to enable. Core credit confirmed within schedule. No carry-forward items."

**WS37-A STATUS: ✅ DONE**
