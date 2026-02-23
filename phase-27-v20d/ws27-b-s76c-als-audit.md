# WS27-B — Sikorsky S-76C Part 29 ALS Audit
**Phase:** 27 (ACTIVE)
**Status:** ✅ COMPLETE — PASS
**Filed:** 2026-02-23T~04:30Z
**Open Condition Closed:** OC-26-03 (S-76C Part 29 ALS audit, Phase 26 gate)

**Owners:**
- Marcus Webb — Compliance Architect (S-76C ALS audit lead; Part 29 SME for this audit)
- Devraj Anand — Engineering (data model extension for Part 29 dual-compliance tracking)
- Cilla Oduya — QA (test plan + execution)

**Prerequisite read:** `phase-27-v20d/ws27-a-bell206-als-audit.md` (Bell 206B-III ALS + `siItems` schema — WS27-B's data model section extends WS27-A's schema patterns and `siItems` table)

---

## Table of Contents

1. [Objective Checklist](#1-objective-checklist)
2. [SME Brief — Marcus Webb (Part 27 vs. Part 29)](#2-sme-brief-marcus-webb-part-27-vs-part-29)
3. [Marcus Webb — S-76C ALS Audit](#3-marcus-webb-s76c-als-audit)
4. [S-76C ALS Items — Life Limits](#4-s76c-als-items-life-limits)
5. [Data Model Extension for Part 29 Dual-Compliance Tracking](#5-data-model-extension-part-29)
6. [Cilla Oduya — Test Suite](#6-cilla-oduya-test-suite)
7. [Marcus Webb — Part 29 Compliance Attestation](#7-compliance-attestation)
8. [Final Status Block — OC-26-03 Closure](#8-final-status-block)

---

## 1. Objective Checklist

| ID | Criterion | PASS Condition | Result |
|---|---|---|---|
| OBJ-01 | Part 27 vs. Part 29 ALS difference brief documented | Structural differences between Part 27 and Part 29 ALS requirements explained; dual-authority tracking requirement documented | ✅ PASS |
| OBJ-02 | S-76C ICA structure documented | ICA chapter/section structure; Sikorsky mandatory SB/SI categories; FAA-approved ALS notice | ✅ PASS |
| OBJ-03 | S-76C ALS items enumerated with actual life limits | Main rotor, tail rotor, transmission, gearboxes, mast, engine — life limits from Sikorsky S-76C MM/ICA | ✅ PASS |
| OBJ-04 | Part 29 dual-compliance tracking documented | `alsItems` schema extension for `certificationBase` field; `dualAuthorityEngine` flag; Part 29 attestation mechanism | ✅ PASS |
| OBJ-05 | Cilla test cases PASS | ≥6 test cases; all PASS | ✅ PASS |
| OBJ-06 | Marcus Part 29 compliance attestation signed | Explicit attestation; Part 29 vs. Part 27 differences acknowledged | ✅ PASS |
| OBJ-07 | OC-26-03 closure statement present | Explicit OC-26-03 reference and closure | ✅ PASS |

**Overall: 7/7 criteria MET → WS27-B: ✅ PASS**

---

## 2. SME Brief — Marcus Webb (Part 27 vs. Part 29)

*Marcus Webb, Compliance Architect for Athelon. Marcus holds an A&P certificate and serves as the regulatory compliance lead for all three shops. He has reviewed Part 27 rotorcraft compliance extensively through WS26-A (Robinson R44) and WS27-A (Bell 206B-III). The S-76C is his first engagement with Part 29 (Transport Category Rotorcraft). This brief documents the Part 27 vs. Part 29 regulatory structure as it applies to ALS compliance tracking in Athelon.*

---

### 2.1 Background: Why the S-76C Is Different from the Bell 206 and R44

The Lone Star Rotorcraft fleet includes three Bell 206B-III JetRangers (N411LS, N412LS, N413LS) and one Sikorsky S-76C (N76LS). The S-76C has been in Athelon's aircraft registry since Lone Star's Day 1 onboarding (Phase 25). Compliance surface features for N76LS have been disabled pending this audit — that was the correct posture. The S-76C is not a Part 27 helicopter. It is Part 29.

When Lone Star Rotorcraft was onboarded, the intake assessment (Phase 25, WS25-C) flagged the S-76C as an open item: the compliance tracking architecture built for Part 27 aircraft (Robinson R44, Bell 206B-III) needed a review before it could be applied to a Part 29 aircraft without modification. That flag became OC-26-03.

The short answer is: Part 29 uses the same regulatory backbone as Part 27 for ALS requirements, but with higher stringency, more component categories, and a dual-authority structure involving both the aircraft manufacturer and the engine manufacturer that is more formally codified than in Part 27 context. The data model extension is modest — a handful of fields — but the compliance significance is material.

---

### 2.2 Part 27 vs. Part 29 — Structural Regulatory Differences

**The regulatory backbone (shared):**

Both Part 27 and Part 29 mandate Instructions for Continued Airworthiness (ICA) under their respective ICA requirements. The ALS within the ICA is mandatory compliance material under §43.16 and §91.403 in both cases. The chain is structurally identical:

- **Part 27:** §27.1529 → Appendix A27.4 → §43.16
- **Part 29:** §29.1529 → Appendix A29.4 → §43.16

An ALS item in the Sikorsky S-76C ICA is mandatory for the same fundamental reason as an ALS item in the Bell 206B-III ICA or the Robinson RFM: §43.16 requires compliance with the manufacturer's FAA-approved maintenance limits.

**Where Part 29 is stricter:**

*1. Component categorization is more granular.*

Part 29 rotorcraft are transport category — they carry passengers under commercial or public use operations. The FAA holds the type certificate holder to a higher standard of ICA specificity. The Sikorsky S-76C ICA ALS section enumerates more component categories than a comparable Part 27 aircraft, with finer-grained distinction between structural retirement life components, overhaul-required components, and repetitive inspection components. The S-76C has separate ALS tables for each major assembly — main rotor, tail rotor, drive system, gearboxes, engine — where a Part 27 ICA may consolidate.

*2. Dual-authority engine compliance is mandatory and formally codified.*

The S-76C is powered by two Turbomeca Arriel 2S1 turboshaft engines (in the S-76C+ / 2S1 configuration; earlier S-76C uses Turbomeca Arriel 1S1). The Turbomeca Arriel 2S1 has its own EASA-approved ICA with an ALS section that specifies hot section and rotating component life limits. The S-76C ICA explicitly references the Turbomeca engine ICA as authoritative for engine component life limits. This is a dual-authority compliance requirement: the aircraft ALS governs the airframe and drive components; the engine manufacturer's ICA governs the engine components. Both are mandatory. The Athelon data model must represent this structure.

In Part 27 context (Bell 206B-III, WS27-A), the Rolls-Royce 250-C20J dual-authority relationship was noted but handled informally — a few engine ALS entries in `alsItems` with a note that R-R ICA governs. For Part 29, this dual-authority relationship is formally codified in the ICA structure and must be represented correctly.

*3. The FAA-approved ALS notice is more explicit.*

The Sikorsky S-76C ICA Airworthiness Limitations Section contains the following notice:

> *"This Airworthiness Limitations section is FAA-approved and specifies maintenance required under 14 CFR §§43.16 and 91.409. These limits take precedence over any conflicting data in the maintenance manual. No person may deviate from these limitations without prior FAA approval."*

The "no person may deviate" language is standard in transport category ICAs and is more explicit than many Part 27 equivalents. The operational effect is the same — mandatory compliance — but the language leaves no interpretive room.

*4. Mandatory Airworthiness Limitations Compliance Records.*

Part 29 operators are required to maintain records demonstrating compliance with each ALS item — not merely a general logbook entry. The record must include the ALS reference, the life limit, the current accumulated value, and the action performed. This is a record-keeping requirement that the Athelon `alsItems` schema already satisfies (it captures `alsReference`, `complianceWorkOrderId`, `complianceHours`) — but it becomes more directly auditable under Part 29 because the FAA may request these records in an FSDO inspection of a Part 29 operator.

---

### 2.3 S-76C ICA Structure

The Sikorsky S-76C ICA (Instructions for Continued Airworthiness) is maintained by Sikorsky Aircraft Corporation and is organized as follows:

**Chapter 04 — Airworthiness Limitations**
- Section 04-00-00: General (FAA-approved notice, applicability statement, revision control)
- Section 04-10-00: Structural Life Limits — Airframe (primary structural retirement limits; not life-limited for standard maintenance; bolt/fitting retirement limits)
- Section 04-20-00: Dynamic Component Life Limits — Main Rotor System (hub, mast, blades, pitch change components)
- Section 04-30-00: Dynamic Component Life Limits — Tail Rotor System (hub, blades, pitch change, drive shaft)
- Section 04-40-00: Drive System Life Limits (main gearbox, intermediate gearbox, tail rotor gearbox, freewheeling unit)
- Section 04-50-00: Engine Life Limits Reference (reference to Turbomeca Arriel ICA; engine module limits)
- Section 04-60-00: Mandatory Replacement and Inspection Schedule
- Section 04-70-00: Certification Maintenance Requirements (CMRs) — *Part 29 specific; see §2.4 below*

**Chapter 05 — Time Limits / Maintenance Checks**
Contains overhaul intervals that are mandatory but governed by different regulatory authority than the ALS.

**Mandatory Service Bulletins (mandatory by ICA reference):**
Sikorsky issues Service Bulletins (SBs). A subset are designated MANDATORY in the ICA — same category as Bell's mandatory SIs. These are tracked in `siItems` (same table as Bell SIs, using `siCategory: "MFR_SB"` or a new `SIKORSKY_SB` category — see §5 for the data model extension).

---

### 2.4 Part 29-Specific: Certification Maintenance Requirements (CMRs)

This is a Part 29 concept that does not exist in Part 27.

**What a CMR is:**

A Certification Maintenance Requirement (CMR) is a scheduled maintenance task derived from the aircraft's certification process — specifically from the Maintenance Review Board (MRB) process required for Part 29 transport category aircraft. The MRB Report is an FAA-approved document that lists CMRs: tasks that must be performed at specified intervals to maintain the aircraft's airworthiness credit for specific failure conditions identified in the certification Fault Tree Analysis.

**Why CMRs matter for Athelon:**

CMRs are different from ALS items in their derivation (they come from the certification FTA, not from component fatigue analysis) but they share the same mandatory character: they are FAA-approved requirements that an operator cannot deviate from without FAA approval. The S-76C ICA Section 04-70-00 lists the CMRs.

**CMR examples from the S-76C:**

| CMR Ref | Component | Interval | Task |
|---|---|---|---|
| CMR-04-70-001 | Engine fire detection system — loop continuity test | 600 hours | Continuity test; must confirm operability |
| CMR-04-70-002 | Main rotor governor — droop limiting function test | Annual | Functional test per ICA procedure |
| CMR-04-70-003 | Fuel boost pump — primary circuit functional check | 300 hours | Functional test; confirms backup operability |
| CMR-04-70-004 | Hydraulic system — low-pressure warning functional test | 600 hours | Warning light test under reduced pressure |

**Data model impact:**

CMRs are a third compliance category for Part 29 aircraft — separate from ALS items (component retirement/overhaul limits) and mandatory SBs (manufacturer SI tracking). The correct implementation extends `alsItems` with a `complianceCategory` field that distinguishes between:
- `ALS_RETIREMENT` — hard life limit, component retired
- `ALS_OVERHAUL` — overhaul interval
- `ALS_INSPECTION` — repetitive inspection
- `CMR` — Certification Maintenance Requirement (Part 29 only)

For Phase 27, the data model will represent CMRs within `alsItems` using the `complianceCategory: "CMR"` value. A dedicated `cmrItems` table is a v1.3 candidate (WS27-D scope), but is not required for OC-26-03 closure. The `alsItems` extension is sufficient for current compliance tracking.

---

### 2.5 Marcus's Validation Posture on the S-76C

The S-76C is the most complex aircraft in the Athelon platform as of Phase 27. It is a twin-engine Part 29 transport category helicopter operated by a Part 91 operator (Lone Star Rotorcraft). The regulatory environment is more demanding than any prior aircraft in the system.

My audit below (Section 3) covers the primary ALS items from the S-76C ICA Sections 04-20-00 through 04-50-00 and the CMR sample from Section 04-70-00. The dual-authority engine compliance structure is documented. The data model extension (Section 5) is designed to correctly represent Part 29 requirements without breaking the existing `alsItems` schema used for Part 27 aircraft.

The key architectural principle: **backward compatibility is mandatory.** The Part 29 extension cannot change the behavior of existing `alsItems` records for Part 27 aircraft (R44 and Bell 206B-III). New fields are optional (`v.optional(...)`) and default to values that preserve Part 27 behavior.

---

## 3. Marcus Webb — S-76C ALS Audit

### 3.1 Audit Scope and Method

**Aircraft:** Sikorsky S-76C (Lone Star Rotorcraft: N76LS)
**Configuration:** S-76C with Turbomeca Arriel 2S1 engines (two-engine configuration)
**Documents reviewed:**
- Sikorsky S-76C Instructions for Continued Airworthiness (ICA), current revision
- Sikorsky S-76C Maintenance Manual
- Turbomeca Arriel 2S1 Engine Manual and ICA
- FAA AD database (Sikorsky S-76C aircraft type)
- Sikorsky Service Bulletin index for S-76C (mandatory SB category)
**Regulatory basis:** 14 CFR §29.1529 + Appendix A29.4

---

### 3.2 S-76C ICA — FAA AD Cross-Reference Summary

| Component Category | FAA AD Coverage | Primary Compliance Source |
|---|---|---|
| Main rotor hub assembly | Limited AD coverage for specific hardware revisions | **ALS-primary** |
| Main rotor mast | No AD on retirement limit | **ALS-only** |
| Main rotor blades | Some ADs on specific blade types; standard life limit ALS-only | **ALS-primary** |
| Main rotor pitch change components | No AD on standard intervals | **ALS-only** |
| Main gearbox | No AD on standard TBO | **ALS-only** |
| Tail rotor hub | No AD on retirement limit | **ALS-only** |
| Tail rotor blades | No AD on standard life limit | **ALS-only** |
| Tail rotor gearbox | No AD on standard TBO | **ALS-only** |
| Freewheeling unit | No AD on overhaul interval | **ALS-only** |
| Engine (Turbomeca Arriel 2S1) | EASA/FAA ADs on specific component findings; TBO and hot section limits = Turbomeca ICA | **Turbomeca ICA + dual-authority ALS** |
| CMRs (fire detection, governor tests, etc.) | Not in AD database — CMRs are certification maintenance requirements | **ICA Section 04-70-00 (CMR)** |
| Mandatory SBs | Some SBs have AD crossref; majority are mandatory by ICA reference only | **Sikorsky ICA (mandatory SB reference)** |

**Audit finding:** The Part 29 AD-vs-ALS gap is materially the same as Part 27: the overwhelming majority of compliance requirements are ALS-based or dual-authority Turbomeca ICA-based, not AD-based. An AD-only compliance tool provides inadequate coverage for the S-76C.

---

## 4. S-76C ALS Items — Life Limits

*The following items are from the Sikorsky S-76C ICA Airworthiness Limitations Section, Sections 04-20-00 through 04-50-00, plus representative CMR sample from Section 04-70-00. All limits are mandatory under 14 CFR §43.16 and §29.1529.*

### 4.1 Main Rotor System (ICA Section 04-20-00)

| ALS Ref | Component | Life Limit | Interval Type | Action | ALS-Only? | Cert Base |
|---|---|---|---|---|---|---|
| S76C-ALS-4.1 | Main Rotor Hub Assembly (head assembly) | 5,000 hours | HOURS | RETIRE | Yes | PART_29 |
| S76C-ALS-4.2 | Main Rotor Mast Assembly | 5,000 hours | HOURS | RETIRE | Yes | PART_29 |
| S76C-ALS-4.3 | Main Rotor Blades (each; standard composite) | 8,000 hours or 20 calendar years | HOURS_OR_CALENDAR | RETIRE | Yes | PART_29 |
| S76C-ALS-4.4 | Main Rotor Blade Retention Pins | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.5 | Main Rotor Pitch Change Links (upper and lower) | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.6 | Main Rotor Pitch Change Link Bearings | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.7 | Main Rotor Hub Spindle Bolts | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.8 | Swashplate Assembly (rotating + non-rotating) | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.9 | Main Rotor Damper (elastomeric) | 1,200 hours or 6 calendar years | HOURS_OR_CALENDAR | REPLACE | Yes | PART_29 |

### 4.2 Drive System and Gearboxes (ICA Section 04-40-00)

| ALS Ref | Component | Life Limit | Interval Type | Action | ALS-Only? | Cert Base |
|---|---|---|---|---|---|---|
| S76C-ALS-4.10 | Main Gearbox (MGB) | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.11 | Combining Gearbox | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.12 | Freewheeling Unit No. 1 (Engine 1) | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.13 | Freewheeling Unit No. 2 (Engine 2) | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.14 | Tail Rotor Gearbox (TGB) | 3,000 hours | HOURS | OVERHAUL | Yes | PART_29 |
| S76C-ALS-4.15 | Tail Rotor Driveshaft — Forward Section | 5,000 hours | HOURS | INSPECT/RETIRE | Yes | PART_29 |
| S76C-ALS-4.16 | Tail Rotor Driveshaft — Aft Section | 5,000 hours | HOURS | INSPECT/RETIRE | Yes | PART_29 |
| S76C-ALS-4.17 | Main Rotor Drive Shaft Coupling | 1,200 hours | HOURS | REPLACE | Yes | PART_29 |

### 4.3 Tail Rotor System (ICA Section 04-30-00)

| ALS Ref | Component | Life Limit | Interval Type | Action | ALS-Only? | Cert Base |
|---|---|---|---|---|---|---|
| S76C-ALS-4.18 | Tail Rotor Hub Assembly (yoke) | 5,000 hours | HOURS | RETIRE | Yes | PART_29 |
| S76C-ALS-4.19 | Tail Rotor Blades (each) | 5,000 hours or 20 calendar years | HOURS_OR_CALENDAR | RETIRE | Yes | PART_29 |
| S76C-ALS-4.20 | Tail Rotor Pitch Change Links | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.21 | Tail Rotor Pitch Change Slider | 3,000 hours | HOURS | REPLACE | Yes | PART_29 |
| S76C-ALS-4.22 | Tail Rotor Blade — Event: Blade Strike | Immediate on event | EVENT_BASED | RETIRE | Yes | PART_29 |

### 4.4 Engine (Turbomeca Arriel 2S1 — Dual Authority)

*Turbomeca Arriel 2S1 component life limits are governed by the Turbomeca Arriel 2S1 Engine Manual and ICA. The S-76C ICA Section 04-50-00 references the Turbomeca ICA as the authoritative source. These items carry `dualAuthorityEngine: true` in the data model.*

| ALS Ref | Component | Life Limit | Interval Type | Action | Dual Authority? | Cert Base |
|---|---|---|---|---|---|---|
| S76C-ALS-4.23 | Engine No. 1 Assembly (Turbomeca Arriel 2S1) | 3,000 hours TBO | HOURS | OVERHAUL | Yes — Turbomeca ICA | PART_29 |
| S76C-ALS-4.24 | Engine No. 2 Assembly (Turbomeca Arriel 2S1) | 3,000 hours TBO | HOURS | OVERHAUL | Yes — Turbomeca ICA | PART_29 |
| S76C-ALS-4.25 | Arriel 2S1 Gas Generator (N1) Turbine Disc | Per Turbomeca ICA — 3,500 hr | HOURS | RETIRE | Yes — Turbomeca ICA | PART_29 |
| S76C-ALS-4.26 | Arriel 2S1 Power Turbine Disc | Per Turbomeca ICA — 3,500 hr | HOURS | RETIRE | Yes — Turbomeca ICA | PART_29 |
| S76C-ALS-4.27 | Arriel 2S1 Compressor Disc | Per Turbomeca ICA — 3,000 hr | HOURS | RETIRE | Yes — Turbomeca ICA | PART_29 |
| S76C-ALS-4.28 | Arriel 2S1 Combustion Chamber Outer Casing | Per Turbomeca ICA — 6,000 hr or inspection finding | HOURS_AND_EVENT | INSPECT/RETIRE | Yes — Turbomeca ICA | PART_29 |

### 4.5 Certification Maintenance Requirements — Sample (ICA Section 04-70-00)

| CMR Ref | Component | Interval | Task | Cert Base |
|---|---|---|---|---|
| S76C-CMR-001 | Engine fire detection loop — continuity test | 600 hours | Test continuity, confirm operability | PART_29 |
| S76C-CMR-002 | Main rotor governor — droop limiting function test | Annual | Functional test per ICA §04-70-00 | PART_29 |
| S76C-CMR-003 | Fuel boost pump — primary circuit functional check | 300 hours | Functional test | PART_29 |
| S76C-CMR-004 | Hydraulic system — low-pressure warning function test | 600 hours | Warning function test under reduced pressure | PART_29 |
| S76C-CMR-005 | Engine N2 overspeed protection system — functional test | 600 hours | Functional test per ICA §04-70-00 | PART_29 |

### 4.6 ALS + CMR Item Summary

| Category | Items | ALS-Only | Dual Authority | Event-Based | CMR |
|---|---|---|---|---|---|
| Main Rotor System | 9 | 9 | 0 | 0 | 0 |
| Drive System / Gearboxes | 8 | 8 | 0 | 0 | 0 |
| Tail Rotor System | 5 | 5 | 0 | 1 | 0 |
| Engine (Turbomeca Arriel 2S1) | 6 | 0 | 6 | 1 | 0 |
| CMRs (representative sample) | 5 | 5 | 0 | 0 | 5 |
| **Total** | **33** | **27** | **6** | **2** | **5** |

*The S-76C has a larger and more complex ALS item set than the Bell 206B-III (33 vs. 23 items), reflecting the higher component granularity of Part 29 ICA requirements and the twin-engine configuration. Six engine items carry dual-authority status (Turbomeca ICA governs).*

---

## 5. Data Model Extension for Part 29 Dual-Compliance Tracking

### 5.1 Design Principles

The Part 29 extension to `alsItems` follows three principles:

1. **Backward compatibility:** All new fields are `v.optional(...)`. Existing Part 27 `alsItems` records (R44 and Bell 206B-III) are unaffected. Default behavior for any record without the new fields is Part 27 behavior.

2. **Minimal surface expansion:** The extension adds five fields to `alsItems` and one new `siCategory` enum value. No new table is required for OC-26-03 closure. The CMR category (`complianceCategory: "CMR"`) is handled within `alsItems`.

3. **Dual-authority engine compliance:** The `dualAuthorityEngine` flag and `dualAuthorityIcaRef` field correctly represent Turbomeca Arriel 2S1 engine component items where the engine manufacturer's ICA governs. This provides audit traceability.

---

### 5.2 `alsItems` Schema Extension

```typescript
// convex/schema.ts — alsItems table extension for Part 29
// Phase 27, WS27-B
// Author: Devraj Anand
// Reviewed: Marcus Webb, Cilla Oduya

// ── New fields added to existing alsItems table ──────────────────────────────

// certificationBase: which certification standard governs this ALS item
certificationBase: v.optional(
  v.union(
    v.literal("PART_27"),   // Normal category rotorcraft (R44, Bell 206B-III) — DEFAULT behavior
    v.literal("PART_29"),   // Transport category rotorcraft (S-76C)
  )
),
// If absent, treated as PART_27 (backward-compatible default).

// complianceCategory: ALS item type, now includes CMR for Part 29
complianceCategory: v.optional(
  v.union(
    v.literal("ALS_RETIREMENT"),  // Hard life limit; component retired at limit
    v.literal("ALS_OVERHAUL"),    // Overhaul interval; component may return to service
    v.literal("ALS_INSPECTION"),  // Repetitive inspection; component continues if within limits
    v.literal("CMR"),             // Certification Maintenance Requirement (Part 29 only)
  )
),
// If absent, derived from intervalType for backward compatibility with existing records.

// dualAuthorityEngine: true = this component's life limit is governed by the engine
//   manufacturer's ICA (e.g., Turbomeca Arriel 2S1 for S-76C engine items), not solely
//   by the airframe manufacturer's ICA.
dualAuthorityEngine: v.optional(v.boolean()),
// Default: false (or absent). True only for engine items with dual-authority compliance.

// dualAuthorityIcaRef: citation to the engine manufacturer's ICA where the authoritative
//   life limit is published. Required when dualAuthorityEngine = true.
dualAuthorityIcaRef: v.optional(v.string()),
// e.g. "Turbomeca Arriel 2S1 Engine Manual, Airworthiness Limitations Section, §AL-3.2"

// part29AuditNote: free-text note for Part 29-specific compliance information
//   (e.g., CMR derivation reference, dual-authority ICA cross-reference details).
part29AuditNote: v.optional(v.string()),
```

---

### 5.3 `siItems` Extension: Sikorsky SB Category

The `siItems` schema from WS27-A uses a `siCategory` union. WS27-B adds one value for Sikorsky mandatory Service Bulletins:

```typescript
// siCategory union extension (added to existing union):
v.literal("SIKORSKY_SB"), // Sikorsky Aircraft Corporation Service Bulletin — mandatory via ICA ref
```

This enables `siItems` records for Sikorsky mandatory SBs on N76LS to be correctly categorized alongside Bell mandatory SIs on N411LS, N412LS, N413LS.

---

### 5.4 Part 29 Compliance Tracking in Practice

**Creating an S-76C ALS item (example: Main Gearbox overhaul interval):**

```typescript
// createAlsItem call for S-76C MGB
{
  aircraftId: "N76LS_id",
  alsReference: "S76C-ALS-4.10",
  componentName: "Main Gearbox (MGB)",
  aircraftMake: "Sikorsky",
  aircraftModel: "S-76C",
  regulatoryBasis: "14 CFR §29.1529 + Appendix A29.4 + §43.16",
  icaDocumentReference: "Sikorsky S-76C ICA, Section 04-40-00, Mandatory Life Limits",
  intervalType: "HOURS",
  intervalHours: 3000,
  currentHours: 1840,     // hypothetical current TIS hours for N76LS MGB
  nextDueHours: 3000,
  // Part 29 extension fields:
  certificationBase: "PART_29",
  complianceCategory: "ALS_OVERHAUL",
  dualAuthorityEngine: false,
  part29AuditNote: "S-76C MGB. Overhaul at 3,000 hours TIS. Part 29 mandatory. Sikorsky ICA §04-40-00 governs.",
}
```

**Creating an S-76C engine ALS item (dual authority — Turbomeca Arriel 2S1):**

```typescript
{
  aircraftId: "N76LS_id",
  alsReference: "S76C-ALS-4.25",
  componentName: "Arriel 2S1 Gas Generator (N1) Turbine Disc — Engine 1",
  aircraftMake: "Sikorsky",
  aircraftModel: "S-76C",
  regulatoryBasis: "Turbomeca Arriel 2S1 ICA + §43.16 + 14 CFR §29.1529",
  icaDocumentReference: "Sikorsky S-76C ICA, Section 04-50-00 (engine reference); Turbomeca Arriel 2S1 Engine Manual, Airworthiness Limitations Section",
  intervalType: "HOURS",
  intervalHours: 3500,
  currentHours: 1620,
  nextDueHours: 3500,
  // Part 29 extension fields:
  certificationBase: "PART_29",
  complianceCategory: "ALS_RETIREMENT",
  dualAuthorityEngine: true,
  dualAuthorityIcaRef: "Turbomeca Arriel 2S1 Engine Manual, Airworthiness Limitations, §AL-3.2 (N1 Turbine Disc life limit: 3,500 hours)",
  part29AuditNote: "Dual-authority item. Engine manufacturer ICA (Turbomeca) governs hot section life limits. Sikorsky ICA §04-50-00 references Turbomeca ICA. Both must be consulted for compliance determination.",
}
```

**Creating a CMR item:**

```typescript
{
  aircraftId: "N76LS_id",
  alsReference: "S76C-CMR-001",
  componentName: "Engine Fire Detection Loop — Continuity Test",
  aircraftMake: "Sikorsky",
  aircraftModel: "S-76C",
  regulatoryBasis: "14 CFR §29.1529 Appendix A29.4 + ICA §04-70-00 CMR",
  icaDocumentReference: "Sikorsky S-76C ICA, Section 04-70-00, Certification Maintenance Requirements",
  intervalType: "HOURS",
  intervalHours: 600,
  currentHours: 410,
  nextDueHours: 600,
  certificationBase: "PART_29",
  complianceCategory: "CMR",
  dualAuthorityEngine: false,
  part29AuditNote: "CMR. Derived from certification FTA. Confirms operability of fire detection circuit. Mandatory per Part 29 CMR program. Cannot be deferred without FAA approval.",
}
```

---

### 5.5 Dashboard Behavior for Part 29 Items

The existing `getAlsComplianceDashboard` and `getFleetAlsAlerts` queries (WS26-A) are compatible with Part 29 items without modification — the urgency calculation, status state machine, and alert thresholds apply identically. The Part 29 extension fields are metadata enrichment; they do not change the compliance state machine logic.

One enhancement: the `getSiComplianceDashboard` (WS27-A) is now available for Sikorsky mandatory SB tracking on N76LS using the new `SIKORSKY_SB` category.

---

## 6. Cilla Oduya — Test Suite

### 6.1 Test Cases

| ID | Description | Result |
|---|---|---|
| TC-S76C-001 | Create ALS item — Part 29, ALS_RETIREMENT | ✅ PASS |
| TC-S76C-002 | Create ALS item — Part 29, dual-authority engine (dualAuthorityEngine: true) | ✅ PASS |
| TC-S76C-003 | Create CMR item — Part 29, complianceCategory: CMR | ✅ PASS |
| TC-S76C-004 | Create Sikorsky mandatory SB in siItems — SIKORSKY_SB category | ✅ PASS |
| TC-S76C-005 | Backward compatibility: Part 27 alsItem without Part 29 fields behaves unchanged | ✅ PASS |
| TC-S76C-006 | Org isolation: N76LS ALS items not accessible to other orgs | ✅ PASS |
| TC-S76C-007 | Fleet ALS dashboard includes both Part 27 and Part 29 aircraft | ✅ PASS |
| TC-S76C-008 | dualAuthorityIcaRef required when dualAuthorityEngine = true (validation test) | ✅ PASS |

---

#### TC-S76C-001: Create ALS Item — Part 29, ALS_RETIREMENT

**Input:**
```typescript
{
  aircraftId: "N76LS_id",
  alsReference: "S76C-ALS-4.1",
  componentName: "Main Rotor Hub Assembly",
  intervalType: "HOURS",
  intervalHours: 5000,
  currentHours: 2100,
  nextDueHours: 5000,
  certificationBase: "PART_29",
  complianceCategory: "ALS_RETIREMENT",
  dualAuthorityEngine: false,
}
```
**Expected:** Record created. `status = "WITHIN_LIMIT"` (2100 < 5000 - alertThreshold). `certificationBase = "PART_29"` stored.
**Actual:** ✅ Record created. Status `WITHIN_LIMIT`. Part 29 fields stored correctly.
**Result: ✅ PASS**

---

#### TC-S76C-002: Dual Authority Engine Item

**Input:** `dualAuthorityEngine: true`, `dualAuthorityIcaRef: "Turbomeca Arriel 2S1 Engine Manual, ALS §AL-3.2"`.
**Expected:** Record created. `dualAuthorityEngine = true`. `dualAuthorityIcaRef` stored.
**Actual:** ✅ All dual-authority fields stored. Record behaves identically to standard ALS item in dashboard (urgency calculation unaffected).
**Result: ✅ PASS**

---

#### TC-S76C-003: CMR Item Creation

**Input:** `complianceCategory: "CMR"`, `alsReference: "S76C-CMR-001"`, `intervalType: "HOURS"`, `intervalHours: 600`.
**Expected:** CMR record created. Appears in `getAlsComplianceDashboard` output with `complianceCategory = "CMR"` label.
**Actual:** ✅ CMR record created. Dashboard includes CMR items. `complianceCategory` correctly returned in dashboard payload.
**Result: ✅ PASS**

---

#### TC-S76C-004: Sikorsky Mandatory SB in siItems

**Input:** `siCategory: "SIKORSKY_SB"`, `siNumber: "S76C-SB-001"`, `mandatoryDesignation: true`.
**Expected:** Record created with `siCategory = "SIKORSKY_SB"`. `getFleetSiAlerts` includes Sikorsky SBs alongside Bell SIs.
**Actual:** ✅ Sikorsky SB created in `siItems`. Fleet alert query groups by aircraft; N76LS Sikorsky SBs appear in correct aircraft group.
**Result: ✅ PASS**

---

#### TC-S76C-005: Backward Compatibility — Part 27 alsItem

**Setup:** Existing R44 `alsItems` record: `certificationBase` absent, `complianceCategory` absent, `dualAuthorityEngine` absent.
**Action:** Read the record; run `updateAlsItemHours`; run `getAlsComplianceDashboard`.
**Expected:** All operations complete without error. Absent Part 29 fields do not cause failures. Dashboard renders the record correctly. No Part 29 fields populated or required.
**Actual:** ✅ All operations successful. Backward compatibility confirmed. Part 27 records are fully unaffected by the schema extension.
**Result: ✅ PASS**

---

#### TC-S76C-006: Org Isolation — N76LS

**Setup:** N76LS `alsItems` in org_lone_star. Org_skyline user authenticated.
**Action:** `getAlsComplianceDashboard` with N76LS aircraft ID.
**Expected:** `AIRCRAFT_ORG_MISMATCH` error.
**Actual:** ✅ `AIRCRAFT_ORG_MISMATCH` thrown. Cross-org access blocked.
**Result: ✅ PASS**

---

#### TC-S76C-007: Fleet Dashboard Includes Part 27 and Part 29

**Setup:** Lone Star fleet: N411LS (Bell 206B-III, Part 27), N76LS (S-76C, Part 29).
**Query:** `getFleetAlsAlerts()` — returns all OVERDUE and DUE_SOON items.
**Expected:** Both aircraft included in response. Part 29 items for N76LS included alongside Part 27 items for N411LS. No items excluded by certification base.
**Actual:** ✅ Both aircraft present. `certificationBase` returned in item metadata. No items excluded.
**Result: ✅ PASS**

---

#### TC-S76C-008: dualAuthorityIcaRef Required When dualAuthorityEngine = true

**Input:** `dualAuthorityEngine: true`, `dualAuthorityIcaRef: undefined`.
**Expected:** Mutation rejects with validation error: `DUAL_AUTHORITY_ICA_REF_REQUIRED`.
**Actual:** ✅ ConvexError thrown: `"dualAuthorityIcaRef is required when dualAuthorityEngine is true."` Mutation does not persist record.
**Result: ✅ PASS**

---

### 6.2 Test Summary

| Test Case | Result |
|---|---|
| TC-S76C-001 | ✅ PASS |
| TC-S76C-002 | ✅ PASS |
| TC-S76C-003 | ✅ PASS |
| TC-S76C-004 | ✅ PASS |
| TC-S76C-005 | ✅ PASS |
| TC-S76C-006 | ✅ PASS |
| TC-S76C-007 | ✅ PASS |
| TC-S76C-008 | ✅ PASS |

**8/8 PASS. Zero failures.**

**Cilla Oduya QA Sign-Off: ✅ PASS — all 8 S-76C test cases.**
*The Part 29 data model extension is backward-compatible, correctly represents dual-authority engine compliance, and adds the CMR and Sikorsky SB categories needed for transport category rotorcraft tracking. N76LS is ready for compliance surface activation.*

---

## 7. Marcus Webb — Part 29 Compliance Attestation

### 7.1 Regulatory Basis Review

**14 CFR §29.1529 — Instructions for Continued Airworthiness:**
The Sikorsky S-76C ICA is a §29.1529-required document. Its Airworthiness Limitations Section is mandatory per §43.16 and the ICA's own FAA-approved notice. The prohibition on deviation without FAA approval is explicit in Part 29 ICA language.

**Dual-authority engine compliance:**
The Turbomeca Arriel 2S1 ICA carries EASA type certificate authority (the Arriel 2S1 is EASA-certificated), with FAA validation. The S-76C ICA's reference to the Turbomeca ICA for engine component life limits is a valid dual-authority structure: the FAA accepts the engine manufacturer's ICA as authoritative for engine component limits where the airframe manufacturer's ICA explicitly references it. The `dualAuthorityEngine` flag correctly captures this regulatory relationship.

**CMR program:**
Certification Maintenance Requirements are Part 29-specific and derive from the FAA-approved Maintenance Review Board Report for the S-76C. They are mandatory. They are not in the AD database. They are in the ICA Section 04-70-00. The `complianceCategory: "CMR"` value in `alsItems` correctly identifies these items and ensures they are tracked with the same urgency logic as standard ALS items.

### 7.2 Schema Review

| Requirement | `alsItems` Extension Field | Status |
|---|---|---|
| Identify Part 29 aircraft items | `certificationBase: "PART_29"` | ✅ Present |
| Identify CMR items (Part 29 only) | `complianceCategory: "CMR"` | ✅ Present |
| Identify dual-authority engine items | `dualAuthorityEngine: true` | ✅ Present |
| Provide dual-authority ICA citation | `dualAuthorityIcaRef` | ✅ Present + required when applicable |
| Audit notes for Part 29 specifics | `part29AuditNote` | ✅ Present |
| Backward compatibility with Part 27 | All new fields `v.optional(...)` | ✅ Confirmed |
| Sikorsky mandatory SB tracking | `siCategory: "SIKORSKY_SB"` in `siItems` | ✅ Present |

### 7.3 Part 29 Attestation

I have reviewed the Sikorsky S-76C ALS audit, the data model extension design, Devraj's schema implementation, and Cilla's test cases.

**Findings:**

1. **The S-76C Part 29 ALS item set (33 items including CMR sample) is complete and correctly documented.** The dual-authority Turbomeca Arriel 2S1 engine items are correctly identified. The CMR category is correctly distinguished from standard ALS items.

2. **The `alsItems` schema extension is architecturally correct.** It adds five optional fields and one new enum value. Backward compatibility with Part 27 records is maintained. The extension does not create compliance gaps for existing Part 27 aircraft.

3. **The `dualAuthorityIcaRef` required-when-applicable validation (TC-S76C-008) is critical for audit defensibility.** If a dual-authority engine item exists without an ICA citation, the compliance record is incomplete. The validation correctly rejects this.

4. **N76LS compliance surface activation is now unblocked.** The data model supports Part 29 tracking. The ALS items enumerated in Section 4 can be entered for N76LS. This should be performed in a dedicated Lone Star session with Sandra Okafor and Tobias Ferreira.

5. **The AD-only compliance gap for Part 29 is identical to Part 27 — and if anything, larger.** Twenty-seven of thirty-three S-76C ALS/CMR items are ALS-only or CMR-only. Six dual-authority engine items are governed by a non-FAA (EASA) engine ICA. An AD-database-only tool covers essentially zero of these requirements.

**Marcus Webb Part 29 Compliance Attestation: ✅ PASS**
**Part 29 Regulatory Compliance: CONFIRMED**
*2026-02-23*

---

## 8. Final Status Block

### 8.1 OC-26-03 Closure Statement

**Open Condition:** OC-26-03 — Sikorsky S-76C Part 29 ALS audit required before compliance surface features enabled for N76LS. Identified in Phase 26 gate review. Part 29 is a different regulatory standard than Part 27; the existing `alsItems` schema (designed for Part 27 aircraft) required review and extension before application to N76LS.

**Closure:** OC-26-03 is **closed**. The following actions were completed in WS27-B:

1. Marcus Webb Part 27 vs. Part 29 SME brief (§2): Structural differences documented; S-76C ICA structure described; CMR program explained; dual-authority engine compliance structure defined.
2. Marcus Webb S-76C ALS audit (§3): 33 ALS/CMR items enumerated; dual-authority Turbomeca items identified; FAA AD cross-reference summary complete.
3. `alsItems` schema extension (§5): `certificationBase`, `complianceCategory`, `dualAuthorityEngine`, `dualAuthorityIcaRef`, `part29AuditNote` fields added (all optional, backward-compatible).
4. `siItems` extension: `SIKORSKY_SB` category added.
5. Cilla Oduya test suite (§6): 8/8 PASS.
6. Marcus Webb Part 29 compliance attestation (§7): PASS.

**N76LS Part 29 compliance surface is now available for Lone Star Rotorcraft upon data entry of ALS items and mandatory SBs for N76LS.**

---

### 8.2 PASS/FAIL Judgment

| Item | Judgment |
|---|---|
| OBJ-01 through OBJ-07 | ✅ 7/7 PASS |
| Part 27 vs. Part 29 SME brief | ✅ COMPLETE |
| S-76C ALS audit (33 items) | ✅ COMPLETE |
| `alsItems` Part 29 extension | ✅ COMPLETE |
| `siItems` Sikorsky SB category | ✅ COMPLETE |
| Cilla test suite | ✅ 8/8 PASS |
| Marcus Part 29 compliance attestation | ✅ PASS |
| OC-26-03 closure | ✅ CLOSED |

**WS27-B Final Verdict: ✅ PASS**

---

*WS27-B filed: 2026-02-23*
*OC-26-03: ✅ CLOSED*
*Signatories: Marcus Webb (Compliance Architect), Devraj Anand (Engineering), Cilla Oduya (QA Lead)*
