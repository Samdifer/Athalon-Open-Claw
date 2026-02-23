# WS30-B — WO-RMTS-002 Combustion Liner Borescope Protocol Closure
**Work Order:** WO-RMTS-002
**Aircraft:** N208MP (Cessna 208B Grand Caravan, S/N 208B0892)
**Powerplant:** Pratt & Whitney Canada PT6A-114A, S/N PCE-54780
**Inspection type:** Combustion liner borescope — AD 2020-18-06 compliance
**Protocol filed:** PROTO-RMTS-001 (PT6A-114A Combustion Liner Borescope Inspection Protocol)
**Owners:** Marcus Webb (protocol lead), Dale Renfrow (co-author), Devraj Anand (WO closure)
**Status:** ✅ DONE
**Closure date:** 2026-04-25

---

## §1. Background

### §1.1 Phase 29 Context

WO-RMTS-002 was opened on 2026-04-15 — RMTS Day 1 of onboarding — when Dale Renfrow's manual AD tracking review (triggered by Marcus Webb's interim compliance checklist delivery) identified that N208MP's PT6A-114A combustion liner borescope was 4.7 hours overdue relative to the 200-hour repetitive interval of AD 2020-18-06.

The borescope inspection was performed on 2026-04-16 by Hector Ruiz (A&P Powerplant, AP-CO-19041), with Dale Renfrow (IA-CO-7742) present and supervising. Findings: combustion liner serviceable. AD 2020-18-06 complied at 11,209.4 hours.

**The interim protocol problem:** When Dale signed the work order on 2026-04-16, Marcus Webb applied what was documented in the Phase 29 gate review as a "Marcus interim protocol" — a set of inspection criteria and acceptance standards Marcus provided from the Pratt & Whitney PT6A-114A Overhaul Manual section 72-20-00, transmitted by email and referenced in the WO notes. The actual WO closure referenced: *"Inspection per PWEC Borescope Manual and Marcus Webb interim protocol email 2026-04-16 08:22 MDT."*

This is not a permanent compliance documentation standard. The interim protocol was technically sound — it correctly cited the CMM acceptance limits — but it was not filed as a formal Athelon inspection protocol. Athelon's inspection protocol registry (used for standardizing recurring maintenance procedures across the platform) did not have a PT6A-114A borescope entry. The gate review flagged this as OI-30-01, carried forward to Phase 30 as WS30-B.

**The difference between an interim protocol and a filed protocol:** An interim protocol is a temporary reference in a single work order. A filed protocol (PROTO-RMTS-001) is a shop-level document that governs the procedure for every future occurrence of this inspection type — linked to the ALS/AD item, accessible to any mechanic doing the work, version-controlled, and referenceable from any WO in the RMTS org.

---

## §2. Protocol Formalization — PROTO-RMTS-001

### §2.1 Drafting (Marcus Webb, 2026-04-22–23)

Marcus Webb drafted PROTO-RMTS-001 from:
1. The P&W Canada PT6A-114A Overhaul Manual, Section 72-20-00 (Combustion Section — Inspection)
2. P&W Canada Service Bulletin SB-21688C (Combustion Liner — Periodic Inspection)
3. AD 2020-18-06 inspection requirements and acceptance criteria
4. The interim protocol references used in the 2026-04-16 WO
5. Dale Renfrow's field notes from the 2026-04-16 borescope session (access port locations, tooling list)

### §2.2 Protocol Document — PROTO-RMTS-001

---

**ATHELON INSPECTION PROTOCOL — PROTO-RMTS-001**
**Revision:** 1.0
**Title:** PT6A-114A Combustion Liner Borescope Inspection
**Applicability:** All PT6A-114A engines maintained under RMTS (Rocky Mountain Turbine Service, KGJT)
**Regulatory authority:** AD 2020-18-06 (FAA Airworthiness Directive); P&W Canada PT6A-114A Overhaul Manual Doc 3007039, Section 72-20-00
**CMM references:** Pratt & Whitney Canada PT6A-114A Maintenance Manual (Component Maintenance Manual — CMM), Document 3021839 Rev 17, Section 72-30-00 (Combustion Section) and Section 72-20-00 (Compressor Section Borescope Access)
**Filed by:** Marcus Webb (Athelon Compliance Lead), co-authored with Dale Renfrow (IA, RMTS DOM)
**Filed date:** 2026-04-24
**Review cycle:** Annual, or upon revision to applicable AD or P&W SB

**1. Purpose**
This protocol establishes the standardized inspection procedure for the PT6A-114A combustion liner borescope inspection, required by AD 2020-18-06 at intervals not to exceed 200 flight hours or at each major periodic inspection, whichever occurs first. This protocol is linked to AD item AD-2020-18-06 in the Athelon AD compliance module.

**2. Regulatory Basis**
- FAA AD 2020-18-06: Requires repetitive borescope inspection of the combustion liner on PT6A-114 series engines to detect cracking, burn-through, and elongated cooling holes that could affect engine integrity. Interval: 200 flight hours or major inspection.
- Reference ICA: P&W Canada PT6A-114A Instructions for Continued Airworthiness (ICA), Document 3021839, Section 72-30-00.

**3. Applicability**
Cessna 208/208A/208B aircraft with PT6A-114 or PT6A-114A engines. RMTS fleet: N208MP (engine PCE-54780), N208TZ (engine PCE-52214). Future additions to RMTS Caravan maintenance portfolio should be assessed for applicability upon onboarding.

**4. Tooling Required**
- Borescope: rigid or flexible, 4mm or smaller diameter, minimum 300mm working length, minimum 30,000 lux illumination
- Access: combustion drain plug ports — forward (port F-1: 12 o'clock position, accessible with cowling removed) and aft (port F-2: 6 o'clock position)
- Torque wrench: 0–150 in-lb range (drain plug reinstallation, 90 in-lb per CMM)
- Sealing compounds: per CMM — drain plug O-ring P/N MS28775-112, replace if deformed or damaged
- Photographic documentation: high-resolution camera or borescope with image capture capability
- Illumination: work light for access area (cowling-off condition)

**5. Access Procedure**
1. Perform cowling removal per Cessna 208B Maintenance Manual applicable section (or aircraft-specific MM).
2. Identify and mark combustion liner access drain ports F-1 and F-2.
3. Remove drain plugs; retain O-rings for condition inspection.
4. Insert borescope through F-1 for forward half inspection; reposition through F-2 for aft half inspection.
5. Rotate borescope 360° at each access station; document all areas systematically (12 zones, 30° increments recommended).

**6. Inspection Criteria (per P&W CMM Section 72-30-00 and AD 2020-18-06)**
Inspect for:
- **Cracks (longitudinal or circumferential):** Serviceable limit — cracks ≤ 2 inches (50.8 mm) total length, not propagating to cooling holes. Any crack > 2 inches: unserviceable.
- **Burn-through:** Any burn-through (hole through liner wall): unserviceable — return to approved turbine facility for repair or replacement.
- **Elongated cooling holes:** Cooling holes elongated > 0.040 inch (1.02 mm) beyond original diameter: unserviceable.
- **Distortion:** Circumferential distortion > 0.015 inch (0.38 mm) TIR from nominal round: unserviceable.
- **Carbon deposits:** Heavy carbon accumulation indicating injector malfunction — document and report to DOM; fuel nozzle inspection recommended (reference AD 2013-12-04).

**7. Acceptance / Rejection Criteria**
- **Serviceable (return to service):** No cracks exceeding serviceable limit; no burn-through; no elongated cooling holes; no distortion exceeding limit. Document all conditions found regardless of disposition.
- **Deferred (DOM authorization required):** Minor cracking within serviceable limit with evidence of propagation pattern — may defer with inspection at reduced interval (100 hours); requires DOM authorization in WO notes.
- **Unserviceable (AOG):** Any condition exceeding serviceable limit as defined above. Aircraft shall not return to service until combustion liner is replaced or repaired by approved facility.

**8. Documentation Requirements**
- All findings shall be documented in the Athelon work order under the WO task for this inspection.
- Photographs shall be attached to the WO (minimum one photo per zone with notable condition; minimum four photos for a serviceable liner: forward half L/R, aft half L/R).
- AD 2020-18-06 compliance entry shall be recorded in the Athelon AD compliance module, linked to WO.
- Signature requirements: A&P Powerplant certificated mechanic performs and signs; IA or DOM provides Return to Service authorization.
- Next interval: record next due hours in AD compliance entry (current hours + 200).

**9. Referenced Documents**
- FAA AD 2020-18-06 (effective 2020-09-14)
- P&W Canada PT6A-114A Overhaul Manual, Doc 3007039, §72-20-00, §72-30-00
- P&W Canada Service Bulletin SB-21688C
- Cessna 208B Maintenance Manual, Cowling Removal section

---

### §2.3 Dale Renfrow Review (2026-04-23)

Dale received the protocol draft on 2026-04-22 by email. His response, 2026-04-23:

**Dale:** "Marcus — this is solid. Two notes. First, add the drain plug torque spec — 90 in-lb per the CMM; I had to look it up last time and it should be in the protocol. Second, on photographic documentation, Hector uses a borescope with built-in image capture. But the protocol should not assume a specific borescope model — it should specify minimum capability. Four photos minimum for serviceable liner is the right floor; I'd actually require more if there's any notable condition. Other than that: this is the protocol we should have had before we did the first one. File it."

Marcus incorporated both comments:
- Torque spec added (90 in-lb, §5, Step 4)
- Photography language revised to specify minimum capability + four-photo minimum for serviceable, more required for conditions noted

Draft v1.0 finalized 2026-04-23. Filed in Athelon 2026-04-24.

---

## §3. WO-RMTS-002 Formal Closure

### §3.1 Closure Record

The work performed on 2026-04-16 by Hector Ruiz was documented under the interim protocol. Upon PROTO-RMTS-001 filing on 2026-04-24, Devraj updated WO-RMTS-002 to:
1. Reference PROTO-RMTS-001 as the governing inspection protocol (retroactively applicable — the work performed met all criteria of the filed protocol)
2. Attach the borescope photographs (4 images, taken by Hector Ruiz during the 2016-04-16 inspection)
3. Confirm AD 2020-18-06 compliance entry was correctly linked
4. Update WO status from "CLOSED (interim)" to "CLOSED (final)"

**Marcus compliance review (2026-04-24):** "The work performed on 2026-04-16 meets every acceptance criterion specified in PROTO-RMTS-001. The interim protocol I applied on that day was drawn from the same CMM source as the filed protocol. The findings documented — serviceable condition, no cracks, no burn-through, no elongated cooling holes — are within limits per both the interim and final protocols. The retroactive protocol reference is appropriate. WO-RMTS-002 is compliant."

### §3.2 Work Order — Final Closure Data

| Field | Value |
|---|---|
| WO Number | WO-RMTS-002 |
| Aircraft | N208MP (Cessna 208B, S/N 208B0892) |
| Engine | PT6A-114A, S/N PCE-54780 |
| Task | Combustion Liner Borescope Inspection — AD 2020-18-06 compliance |
| Regulatory basis | AD 2020-18-06; PROTO-RMTS-001 |
| CMM reference | P&W Canada Doc 3021839 Rev 17, §72-30-00 |
| Date of inspection | 2026-04-16, 07:30–11:15 MDT |
| Performed by | Hector Ruiz (A&P Powerplant, AP-CO-19041) |
| DOM/RTS authorization | Dale Renfrow (IA-CO-7742, DOM RMTS) |
| Aircraft TT at compliance | 11,209.4 hours |
| Findings | Combustion liner serviceable — no cracks, no burn-through, no elongated cooling holes. All four inspection photographs attached. |
| Outcome | **SERVICEABLE** |
| AD compliance status | COMPLIANT — complied at 11,209.4 hr |
| Next due interval | 11,409.4 hr (200-hour interval) |
| Protocol reference | PROTO-RMTS-001 (filed 2026-04-24) |
| WO closure status | **CLOSED (FINAL)** — 2026-04-25 |
| Final sign-off | Marcus Webb (Athelon Compliance), 2026-04-25 |

### §3.3 AD Compliance Module Update

AD 2020-18-06 compliance record for N208MP engine PCE-54780:
- Status: **COMPLIANT**
- Last compliance: 11,209.4 hr (2026-04-16)
- Next due: 11,409.4 hr
- Protocol reference: PROTO-RMTS-001
- F-1.4-A interval tracking active: YES (automated — interval tracking migrated from manual to Athelon per RMTS-OI-02 completion following Sprint 1 release)

---

## §4. Protocol Registry Impact

PROTO-RMTS-001 is the first turbine-type inspection protocol filed in Athelon's protocol registry. It is linked to:
- AD item: AD-2020-18-06 (PT6A-114 combustion liner borescope)
- Engine type: PT6A-114A
- Aircraft type: Cessna 208/208A/208B
- Applicable shops: RMTS (Rocky Mountain Turbine Service, KGJT)

The protocol registry now contains:
- PROTO-RMTS-001: PT6A-114A Combustion Liner Borescope Inspection (new — 2026-04-24)
- Previous entries: piston-engine inspection protocols from earlier phases

**Marcus (filed note):** "PROTO-RMTS-001 is a landmark entry — not because the borescope protocol is technically novel, but because it demonstrates that Athelon can host and govern turbine-type inspection protocols with the same structure as piston protocols. The PT6A-114A is the entry point. The PT6A-60A (B200 King Air) protocol is next on the list. Desert Sky Turbine's PT6A-60A work in Phase 27 didn't produce a filed protocol — those WOs referenced the CMM directly. That's an open item for future cleanup."

---

## §5. OI-30-01 Closure

> **OI-30-01 — CLOSED**
> PROTO-RMTS-001 filed in Athelon 2026-04-24. WO-RMTS-002 updated to reference PROTO-RMTS-001 and formally closed 2026-04-25. AD 2020-18-06 compliance confirmed COMPLIANT at 11,209.4 hr. Outcome: SERVICEABLE. Next due: 11,409.4 hr. All documentation meets 14 CFR Part 43 Appendix B records requirements for major inspection documentation.
>
> — Marcus Webb, 2026-04-25

---

*WS30-B is complete. WO-RMTS-002 is formally closed. PROTO-RMTS-001 is the first turbine-type inspection protocol in Athelon's protocol registry. The combustion liner borescope performed by Hector Ruiz on 2026-04-16 is documented, compliant, and referenced correctly.*
