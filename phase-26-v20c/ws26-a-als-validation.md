# WS26-A — Robinson R44 ALS Validation Audit + `alsItems` Schema
**Phase:** 26 (ACTIVE)  
**Status:** ✅ COMPLETE — PASS  
**Filed:** 2026-02-23T06:00:00Z  
**Open Condition Closed:** OC-25-01 (Robinson R44 ALS field mapping validation, Phase 25 gate review)

**Owners:**
- Marcus Webb — Compliance Officer (Robinson ALS audit lead)
- Tobias Ferreira — Robinson-qualified CFI / A&P, Lone Star Rotorcraft, Tucson AZ (SME)
- Devraj Anand — Implementation (`alsItems` schema + Convex implementation)
- Cilla Oduya — QA (test plan + execution)
- Jonas Harker — Infrastructure (alert logic)

**Artifacts produced by this workstream:**
- `phase-26-v20c/ws26-a-als-validation.md` ← this document

---

## Table of Contents

1. [Objective Checklist with PASS/FAIL Criteria](#1-objective-checklist)
2. [SME Brief — Tobias Ferreira (Robinson-Qualified IA)](#2-sme-brief-tobias-ferreira)
3. [Marcus Webb's Robinson R44 ALS Audit](#3-marcus-webb-robinson-r44-als-audit)
4. [`alsItems` Data Model — Schema Definition](#4-alsitems-data-model)
5. [ALS Compliance Tracking — Convex Implementation](#5-als-compliance-tracking-implementation)
6. [Robinson R44 ALS Seed Data (Real Component Life Limits)](#6-robinson-r44-als-seed-data)
7. [Cilla Oduya — Test Plan + Execution](#7-cilla-oduya-test-plan--execution)
8. [Marcus Webb — Part 27.1529 Compliance Review](#8-marcus-webb-compliance-review)
9. [Final Status Block — OC-25-01 Closure](#9-final-status-block)

---

## 1. Objective Checklist

The following checklist governs the PASS/FAIL determination for WS26-A. Every criterion must be met. No partial credit.

| ID | Criterion | PASS Condition | FAIL Condition | Result |
|---|---|---|---|---|
| OBJ-01 | Marcus's Robinson R44 ALS audit complete | All ALS items from R44 Raven II RFM Section 4 enumerated; each item has a regulatory basis note and FAA AD cross-reference status | Any ALS item in RFM Section 4 omitted; any item's AD cross-reference status unknown | ✅ PASS |
| OBJ-02 | Tobias Ferreira field interview complete | Tobias has confirmed ALS item list against his field experience; at minimum confirms main rotor blade retention bolt interval and ALS-only status | Interview not conducted; Tobias's sign-off absent | ✅ PASS |
| OBJ-03 | ALS vs. AD distinction validated for at least one ALS-only item | At least one R44 component confirmed to have a mandatory maintenance interval in the ALS with no corresponding FAA AD | No ALS-only items identified; all items have corresponding ADs | ✅ PASS |
| OBJ-04 | `alsItems` table designed with all required fields | Schema present: `alsReference`, `componentName`, `componentPartNumbers`, `aircraftMake`, `aircraftModel`, `regulatoryBasis`, `icaDocumentReference`, `icaRevision`, `intervalType`, `intervalHours`, `intervalCalendarDays`, `eventType`, `currentHours`, `nextDueHours`, `nextDueDate`, `status`, `lastComplianceWorkOrderId`, `relatedAdNumber`; indexes on `by_org_aircraft`, `by_org_status`, `by_aircraft_als_ref` | Any specified field absent; index on `by_org_aircraft` missing; status enum incomplete | ✅ PASS |
| OBJ-05 | Compliance state machine defined | States: `WITHIN_LIMIT`, `DUE_SOON`, `OVERDUE`, `REPLACED`, `RETIRED`; all transitions defined; event-based trigger to `OVERDUE` (blade strike, overspeed, hard landing) defined | Any state or transition undefined; event trigger logic absent | ✅ PASS |
| OBJ-06 | Convex mutations implemented: create, update, close ALS items | `createAlsItem`, `updateAlsItemHours`, `closeAlsItemWithReplacement`, `recordAlsEvent` mutations present with auth guards, org isolation, and status transition logic | Any mutation missing; org isolation absent; auth guard absent | ✅ PASS |
| OBJ-07 | Convex query implemented: ALS compliance dashboard per aircraft | `getAlsComplianceDashboard` query returns all `alsItems` for an aircraft, sorted by urgency (OVERDUE → DUE_SOON → WITHIN_LIMIT), with hours-to-next-due and days-to-next-due computed | Query absent; urgency sort absent; computed fields absent | ✅ PASS |
| OBJ-08 | Alert logic: approaching limit and exceeded limit | Alert fires when `currentHours ≥ (nextDueHours - alertThresholdHours)` or `today ≥ (nextDueDate - alertThresholdDays)`; OVERDUE alert fires when either limit exceeded; DOM dashboard integration defined | Alert logic absent; DOM dashboard integration absent | ✅ PASS |
| OBJ-09 | R44 ALS seed data complete | All items from R44 Raven II RFM Section 4 (ALS) present with actual life limits and correct part numbers where specified; minimum: main rotor blades, main rotor hub, main rotor blade retention bolts, tail rotor blades, tail rotor hub, drive belt system, engine TBO, governor, mast | Any item from RFM Section 4 missing from seed data; life limits not matching RFM | ✅ PASS |
| OBJ-10 | Cilla Oduya: all 10 test cases PASS | TC-ALS-001 through TC-ALS-010 all PASS | Any test case FAIL; any test case untested | ✅ PASS |
| OBJ-11 | Marcus Webb: Part 27.1529 compliance attestation signed | Explicit statement that `alsItems` model satisfies §27.1529 ICA requirements; no NOT_APPLICABLE path confirmed in schema; RFM revision tracking mechanism confirmed present | Attestation absent; any NOT_APPLICABLE path identified in schema | ✅ PASS |
| OBJ-12 | OC-25-01 closure statement present | Explicit reference to OC-25-01 from Phase 25 gate review; statement that LLP dashboard enable gate for Lone Star Rotorcraft is now clear | OC-25-01 not explicitly closed; LSR LLP gate not addressed | ✅ PASS |

**Overall: 12/12 criteria MET → WS26-A: ✅ PASS**

---

## 2. SME Brief — Tobias Ferreira (Robinson-Qualified IA)

*This brief is written from Tobias Ferreira's perspective. Tobias is an R44-rated CFI and A&P mechanic with twelve years of Robinson maintenance experience, based in Tucson, Arizona, where he works as the lead A&P/IA at Lone Star Rotorcraft's Tucson satellite operations. His remarks below represent his field interview with Marcus Webb, conducted for WS26-A validation.*

---

### 2.1 Who I Am and Why My Opinion on This Matters

I've been doing Robinson work since I was an A&P riding right seat at a flight school in New Mexico. Twelve years later I hold a DPE designation for Robinson, I sign off R44 annuals weekly, and I've personally retired more than a few main rotor blade sets that I found because the interval was coming up on the ALS — not because anyone told me there was an AD. There isn't an AD. There doesn't need to be. The ALS is the mandate.

Marcus called me about this audit, and when he described what Athelon was doing — building a separate data model for ALS items rather than lumping them into the AD compliance module — I told him that was the first time I'd heard a software person understand the distinction without me having to explain it for thirty minutes first.

---

### 2.2 ALS vs. AD: What the Distinction Means for R44 Operators

Let me be direct about this because I've watched it go wrong too many times.

**An Airworthiness Directive is issued by the FAA.** It comes out of the AD database. It has a number. It looks like this: 2024-15-07. You can search it. You can reference it. When you comply with it, you write the AD number on the maintenance record, you note the hours and date, and you're done. The FAA's enforcement record is searchable. The AD is the government's mechanism for mandating a specific action.

**An Airworthiness Limitations Section is different in every way that matters operationally.** The ALS lives in the Rotorcraft Flight Manual. It's Robinson's document — not the FAA's — but it has FAA-approved status, which means the limits in it are mandatory. There is no negotiation. There is no operator Alternative Method of Compliance (AMOC) equivalent. When Robinson says replace the main rotor blade retention bolts at 2,200 hours, that's the interval. Full stop.

The reason this causes confusion at shops that haven't done Robinson work before: the FAA AD database returns nothing on the main rotor blade retention bolts. You search for Robinson R44 ADs and you get back a list of actual ADs — there are some on the R44, mostly related to specific hardware revisions and SB incorporations. But for the standard blade retention bolt replacement interval? Nothing in the AD database. Because it's not an AD. It's an ALS item.

A shop that uses MRO software and relies entirely on the AD compliance module sees no alert on those bolts. The interval comes and goes. Nobody notices because the software said everything was compliant. That's the failure mode.

---

### 2.3 Why the R44 Pilot's Operating Handbook (POH/RFM) and Maintenance Manual Require Separate ALS Tracking

Robinson published the R44 Raven II Rotorcraft Flight Manual with Section 4 designated as the Airworthiness Limitations. This is the FAA-approved section. The Robinson R44 Maintenance Manual (MM) cross-references the RFM ALS — it doesn't duplicate it, it points you back to the RFM. This matters because:

**The RFM is what you get with the aircraft.** Every R44 Raven II delivered from the factory comes with an RFM. The ALS in the RFM is the authoritative compliance document. The maintenance manual tells you how to do the work. The RFM tells you when you have to do it.

**The FAA approved the ALS as part of the type design.** This is the mechanism under 14 CFR §27.1529 — manufacturers of rotorcraft are required to produce Instructions for Continued Airworthiness, and the ALS is the mandatory-replacement portion of those ICA. It's not advisory. It's not a recommendation. The FAA signed off on it as part of the type certificate. When you don't comply with it, you are operating an aircraft out of its type design limits.

**The intervals can change via RFM revision.** Robinson issues RFM revisions periodically. When an ALS interval changes — and they have changed over the R44's production life — the revision updates the RFM, not an AD. If you're tracking these items in an AD compliance module, you never see the revision. If you're tracking them in an ALS-specific module, you can surface a "RFM revision updated — review your ALS intervals" flag. That's how it should work.

---

### 2.4 How Most MRO Software Gets This Wrong

I've used or evaluated six MRO software systems in my career. Here's the pattern:

**They build an AD compliance module.** This works well for fixed-wing, where most mandatory maintenance originates from ADs. They iterate, refine, and build that module out. It becomes the core compliance tracking feature.

**They market it to helicopter shops without changing the underlying model.** The AD compliance module for fixed-wing becomes the "compliance module" for helicopters. The product manager adds Robinson and Bell to the aircraft type list. The AD feed now covers those aircraft. The shop signs up.

**The gap is invisible to the customer until something goes wrong.** The AD compliance module returns true positives — real ADs that apply to the R44. What it doesn't flag is the ALS items that have no corresponding AD. The shop sees a clean compliance report. They feel good. Then the annual comes up and a sharp IA (or an FSDO inspector) asks about the main rotor blade retention bolt interval and the shop discovers the software never told them it was due because the software doesn't know what an ALS is.

I've seen this happen. The shop I worked at in 2018 had this exact scenario. A Part 135 operator using MRO software, running R44s, and their software showed full AD compliance. I did an owner-requested independent inspection. The blade retention bolts were at 2,340 hours. The ALS limit is 2,200 hours. The bolts were 140 hours overdue. The software had never flagged it because there's no AD on those bolts.

That aircraft had been dispatched for 140 hours past the mandatory replacement interval for a primary flight-critical fastener.

---

### 2.5 The Failure Risk of Missing an ALS Item on an R44

I'm going to be specific here because this is not a hypothetical.

**Main rotor blade retention bolts** secure the main rotor blades to the hub. If a retention bolt fails in flight, the blade separates. A separating main rotor blade on an R44 is not a controllable event. The aircraft does not have the structural reserves to survive dynamic component failure at that location. The R44 is a light helicopter with a relatively small design margin — that's part of what makes it economical and popular. It's also why the maintenance intervals on primary dynamic components are not suggestions.

Robinson sets the blade retention bolt interval at 2,200 hours or 12 calendar years, whichever comes first, based on their engineering analysis of the fastener's fatigue life under the rotational loads experienced by the hub-blade attachment. This interval has never been arbitrary. It's derived from the type design analysis Robinson submitted to the FAA. The FAA approved the ALS section — and this interval — as part of the type certificate.

The consequence of missing this interval isn't degraded performance or an instrument discrepancy. It's a flight-critical failure mode. Robinson has documented accidents in their service documentation that inform these intervals. The intervals exist because the failure mode was analyzed and the safe-life limit was calculated.

When MRO software fails to surface this as a mandatory maintenance action, the operational risk falls entirely on the shop and the operator. The software's silent clean report is an affirmative misdirection — it says "you're compliant" when the aircraft is actually operating outside its type design limits.

---

### 2.6 ALS Field Mapping Validation — Tobias's Confirmation

Marcus shared his enumerated ALS item list with me before this interview. I reviewed it against my field knowledge and my personal copy of the R44 Raven II RFM (current revision). My confirmations:

- **Main rotor blade retention bolts:** ALS-only, no corresponding FAA AD. Interval: 2,200 hours or 12 calendar years. ✅ Confirmed.
- **Main rotor blades:** ALS-specified interval; Robinson SB-34 and related SBs incorporated into some ADs, but the standard life limit is ALS-driven. ✅ Confirmed.
- **Main rotor hub and spindle assembly:** Retirement limit is ALS-specified. ✅ Confirmed.
- **Tail rotor blades:** ALS interval; also subject to immediate retirement on blade strike event. ✅ Confirmed — the event-based trigger is critical to model correctly.
- **Tail rotor hub:** ALS-specified retirement limit. ✅ Confirmed.
- **Drive belt system:** Robinson uses a belt-and-pulley system between engine and rotor; belt replacement intervals are ALS-specified, not AD-specified. This is often the first ALS item new R44 operators discover they've been tracking incorrectly. ✅ Confirmed ALS-only status.
- **Lycoming engine TBO (O-540 variants):** The TBO is a manufacturer-published limit that interacts with the ALS; Robinson specifies both Lycoming's TBO and Robinson-specific engine replacement criteria that may be more restrictive. ✅ Confirmed — dual authority, Lycoming TBO + Robinson ALS engine limit.
- **Engine governor:** Governor overhaul interval is ALS-specified. ✅ Confirmed.
- **Mast assembly:** Retirement limit per ALS; also subject to immediate inspection or retirement on hard landing or overspeed event. ✅ Confirmed — event-based trigger required.
- **Pitch links, pitch link bearings:** ALS-specified inspection and replacement intervals. ✅ Confirmed.
- **Cyclic and collective control components (selected):** Some have ALS inspection intervals. ✅ Confirmed — Marcus's enumeration matches my field knowledge.
- **Teeter bolt and teeter bolt nut:** ALS-specified replacement interval. ✅ Confirmed ALS-only.
- **Swashplate assembly components:** ALS-specified inspection intervals. ✅ Confirmed.

**One item Marcus did not include that I want to add:** The Robinson Carb Heat Hose and carb heat box on the carburetor-equipped R44 (earlier variants) have an inspection interval that appears in the RFM ALS for those variants. The Raven II uses the Lycoming O-540-F1B5 which is fuel injected — this item does not apply to the Raven II. Marcus confirmed this is R22 and earlier R44 variant-specific. I'm noting it for completeness but it is not in scope for the Raven II seed data.

**Overall assessment:** Marcus's enumeration is complete and accurate for the R44 Raven II. The ALS-only items are correctly identified. The event-based trigger items (tail rotor blade, mast) are correctly flagged. The data model distinction from AD compliance records is correct and is the right design.

**Tobias Ferreira — Field Interview Complete**  
**Sign-off: ✅ VALIDATED — R44 ALS component set confirmed by Robinson-qualified IA**  
*Tucson AZ, 2026-02-23*

---

## 3. Marcus Webb's Robinson R44 ALS Audit

### 3.1 Audit Scope and Method

**Aircraft:** Robinson R44 Raven II (primary), Robinson R22 Beta II (secondary — data model compatibility check)  
**Document reviewed:** R44 Raven II Rotorcraft Flight Manual (RFM), Section 4 — Airworthiness Limitations, current revision at time of audit  
**Cross-reference:** FAA AD database (rgl.faa.gov/adportal) — Robinson R44 aircraft type  
**Field validation:** Tobias Ferreira (Robinson IA, 12 years R44 experience)  
**Regulatory basis:** 14 CFR §27.1529 (Airworthiness Limitations — Rotorcraft)

---

### 3.2 RFM ALS Structure

The Robinson R44 Raven II RFM Section 4 is designated as the Airworthiness Limitations section (ALS). It carries the following notice, which is standard Robinson language:

> *"This section, consisting of FAA-approved airworthiness limitations, is FAA approved and specifies maintenance required under 14 CFR §§43.16 and 91.403 of the Federal Aviation Regulations unless an alternative program has been FAA-approved."*

This notice is the key regulatory statement: the ALS items are mandatory, they derive their authority from the ICA requirements under §27.1529, and compliance is required under §§43.16 and 91.403. This is not advisory content. This is not manufacturer "recommended" maintenance. This is FAA-approved mandatory maintenance.

The ALS is organized into tables. Each table row specifies:
- Component or assembly
- Part number(s) where applicable
- Life limit (hours, calendar, or both — whichever first)
- Action required at limit (replacement, overhaul, or inspection)

---

### 3.3 FAA AD Database Cross-Reference — Findings

For each ALS category, I searched the FAA AD database for Robinson Helicopter Company R44/R44 II aircraft.

| ALS Category | FAA AD Status | Compliance Source | Notes |
|---|---|---|---|
| Main rotor blades — standard life limit | No AD on primary interval | **ALS-only** | Some Robinson SBs incorporated into ADs address specific blade variants; the standard hour/calendar life limit has no AD equivalent |
| Main rotor blade retention bolts | **No AD exists** | **ALS-only** | This is the item Sandra identified in the pre-onboarding call. Confirmed ALS-only by Marcus and Tobias. |
| Main rotor hub/spindle retirement | No AD on retirement limit | **ALS-only** | AD 2016-15-14 covers an inspection on certain S/Ns but does not establish the retirement interval |
| Tail rotor blades — standard life limit | No AD on primary interval | **ALS-only** | |
| Tail rotor blade — blade strike event | No AD | **ALS + MM Event Protocol** | Immediate ground / inspection mandated by ALS and MM Chapter 5; no AD needed — it's a triggering event |
| Tail rotor hub | No AD on retirement limit | **ALS-only** | |
| Main drive belt | **No AD on belt replacement interval** | **ALS-only** | Frequently missed by shops that track only ADs. Belt interval is ALS-mandated. |
| Idler pulley and jackshaft | No AD on retirement intervals | **ALS-only** | |
| Engine (Lycoming O-540-F1B5) TBO | Lycoming SB 240P governs TBO; no separate FAA AD mandating Lycoming TBO in Robinson context | **Lycoming manufacturer ICA + Robinson ALS engine limit** | Robinson ALS specifies a maximum engine time that may be equal to or more restrictive than Lycoming TBO; both apply |
| Engine governor (Marvel-Schebler or Lycoming) | AD 2011-10-09 covers specific governor batches; standard overhaul interval is ALS | **ALS primary; some batches also AD** | Per Tobias: most currently operating R44 Raven IIs are past the specific AD-covered governor batch vintage; the ALS governs for current fleet |
| Mast assembly — retirement limit | No AD on retirement | **ALS-only** | Event-based protocol on hard landing and overspeed — also ALS |
| Teeter bolt and nut | **No AD** | **ALS-only** | Another frequently missed interval; no AD exists; interval is pure ALS |
| Pitch links and bearings | No AD on standard replacement interval | **ALS-only** | |
| Swashplate components (rotating and stationary plates) | No AD on standard replacement | **ALS-only** | |
| Cyclic and collective controls (selected joints and bearings) | No AD on inspection intervals | **ALS-only** | |
| Rotor brake (if installed) | No AD on service interval | **ALS-only** | |
| RFM currency | Not an AD item | **Operational requirement** | ALS requires current RFM edition be on the aircraft; tracked as a currency item |

**Audit finding summary:**
- Items with ALS intervals and **no corresponding FAA AD**: 14 out of 16 categories
- Items where an AD exists on a **specific variant or batch** but the primary ALS interval has no AD: 2 out of 16
- Items where an AD is the primary compliance driver and the ALS references or echoes the AD: 0 out of 16

**This is the core audit finding:** Robinson R44 Airworthiness Limitations compliance is overwhelmingly ALS-driven, not AD-driven. An AD-database-only compliance tracking tool provides essentially zero coverage of Robinson R44 ALS compliance requirements.

---

### 3.4 R22 vs. R44 ALS Structure Comparison

Lone Star Rotorcraft also operates an R22 (used for flight training partnership). I reviewed the R22 Beta II RFM ALS alongside the R44 for data model compatibility.

**Key findings:**
- The R22 ALS follows the same organizational structure as the R44 ALS — same table format, same types of limits (hours, calendar, whichever first), same event-based triggers (blade strike, hard landing, overspeed).
- Component names differ by model (R22 uses a different main rotor blade P/N set, different engine — Lycoming O-320), but the data model fields map identically.
- The R22 ALS has slightly shorter intervals on some dynamic components (reflecting the different rotor system sizing and fatigue analysis).
- **Conclusion:** The `alsItems` data model designed for R44 is fully compatible with R22 ALS tracking. The `aircraftModel` field distinguishes the two. No schema modification is needed to support both.

---

### 3.5 Audit Conclusion

The Robinson R44 Raven II ALS is a comprehensive mandatory maintenance schedule embedded in the RFM. It covers all primary dynamic components. The majority of the items in the ALS have no corresponding FAA AD. An MRO software product that tracks only FAA ADs will miss virtually all of the Robinson R44's mandatory maintenance intervals for dynamic components.

The `alsItems` data model (Section 4) is the correct response. The distinction between `alsItems` and `adComplianceRecords` is not cosmetic — it reflects a genuine regulatory and operational distinction that matters for helicopter operator safety.

**Marcus Webb — Robinson R44 ALS Audit Complete**  
**Audit sign-off: ✅ PASS**  
*2026-02-23*

---

## 4. `alsItems` Data Model

### 4.1 Design Rationale

The `alsItems` table is architecturally separate from `adComplianceRecords`. This is intentional. The table comparison from the WS26 plan is the correct framing:

| Dimension | `adComplianceRecords` | `alsItems` |
|---|---|---|
| Source | FAA AD database | Manufacturer RFM/ICA ALS section |
| Regulatory authority | 14 CFR Part 39 | 14 CFR §27.1529 / manufacturer ICA |
| Reference number | FAA AD number (e.g., 2024-15-07) | ALS section ref (e.g., `R44-ALS-4.3`) |
| Interval type | Varies by AD | Mandatory replacement/inspection per ALS |
| Override mechanism | AMOC (operator-requested FAA approval) | FAA-approved RFM revision only — no operator AMOC path |
| NOT_APPLICABLE path | Yes — four enumerated bases (§39.23) | **No** — ALS items apply to all aircraft of the covered model |
| Compliance status values | COMPLIANT / NOT_APPLICABLE / PENDING / DEFERRED / OVERDUE | WITHIN_LIMIT / DUE_SOON / OVERDUE / REPLACED / RETIRED |

---

### 4.2 Schema Definition

```typescript
// convex/schema.ts — alsItems table addition

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Compliance Status Enum ─────────────────────────────────────────────────
// State machine: WITHIN_LIMIT → DUE_SOON → OVERDUE → REPLACED
//                               ↑ event ↘ → RETIRED
// Note: NOT_APPLICABLE is explicitly not included. ALS items apply to all
// aircraft of the covered type. No operator can mark an ALS item as not
// applicable. 14 CFR §43.16 and §91.403 enforce compliance.

const alsComplianceStatus = v.union(
  v.literal("WITHIN_LIMIT"),  // current hours/date within limit; no alert threshold breached
  v.literal("DUE_SOON"),      // within configurable alert threshold (default: 10 hrs or 30 days)
  v.literal("OVERDUE"),       // limit exceeded by hours OR calendar, or event-based trigger fired
  v.literal("REPLACED"),      // component replaced; record closed; new record created for replacement
  v.literal("RETIRED"),       // retired due to event (blade strike, overspeed, hard landing)
);

// ─── Interval Type Enum ─────────────────────────────────────────────────────
const alsIntervalType = v.union(
  v.literal("HOURS"),               // hours-only limit
  v.literal("CALENDAR"),            // calendar-only limit
  v.literal("HOURS_OR_CALENDAR"),   // whichever first (most common for Robinson dynamic components)
  v.literal("EVENT_BASED"),         // trigger on specific event, regardless of hours
  v.literal("HOURS_AND_EVENT"),     // hours limit AND event-based retirement
  v.literal("INSPECTION_INTERVAL"), // periodic inspection (not retirement) — interval measured in hours
);

// ─── Event Type Enum ─────────────────────────────────────────────────────────
const alsEventType = v.union(
  v.literal("BLADE_STRIKE"),   // main or tail rotor blade contact with object or ground
  v.literal("HARD_LANDING"),   // hard landing event (requires mast inspection per Robinson MM)
  v.literal("OVERSPEED"),      // rotor overspeed event
  v.literal("OTHER"),          // other event-based trigger; described in eventNotes
);

// ─── Regulatory Basis Enum ────────────────────────────────────────────────────
const alsRegulatoryBasis = v.union(
  v.literal("ICA_ALS_PART27"),    // 14 CFR §27.1529 — Normal Category Rotorcraft ICA
  v.literal("ICA_ALS_PART29"),    // 14 CFR §29.1529 — Transport Category Rotorcraft ICA
  v.literal("ICA_ALS_PART23"),    // 14 CFR §23.1529 — Fixed-Wing (for future use)
);

// ─── alsItems Table Definition ───────────────────────────────────────────────
export const alsItems = defineTable({
  // ── Org and Aircraft Scope ──────────────────────────────────────────────────
  orgId: v.id("organizations"),       // org-scoped; derived from auth, never from client args
  aircraftId: v.id("aircraft"),       // the specific aircraft this ALS record tracks

  // ── ALS Item Identification ─────────────────────────────────────────────────
  alsReference: v.string(),
  // Manufacturer ALS section reference, formatted as:
  //   "{make}-ALS-{section}.{paragraph}" e.g. "R44-ALS-4.3"
  // Must be unique per aircraftId. Enforced at mutation layer.

  componentName: v.string(),
  // Human-readable component name. e.g. "Main Rotor Blade Retention Bolts"

  componentPartNumbers: v.optional(v.array(v.string())),
  // Robinson part numbers for the specific component. May be null when
  // the ALS item references an assembly without a single P/N (e.g., "blade set").

  componentSerialNumber: v.optional(v.string()),
  // Serial number of the installed component, if tracked individually.
  // Relevant for components that carry their own logbook (e.g., engine).

  aircraftMake: v.string(),           // e.g. "Robinson Helicopter Company"
  aircraftModel: v.string(),          // e.g. "R44 Raven II"
  aircraftSerialNumber: v.optional(v.string()), // for additional traceability

  // ── Regulatory Authority ────────────────────────────────────────────────────
  regulatoryBasis: alsRegulatoryBasis,
  // For all Robinson R44/R22 items: ICA_ALS_PART27

  icaDocumentReference: v.string(),
  // Full citation to the ALS section in the manufacturer document.
  // e.g. "R44 Raven II Rotorcraft Flight Manual, Section 4 (Airworthiness Limitations), ¶4.3"

  icaRevision: v.string(),
  // RFM revision number at the time this record was created or last reviewed.
  // e.g. "Revision 5, dated 2023-09-01"
  // When Robinson issues a new RFM revision, the DOM must confirm ALS intervals
  // are unchanged. If changed, the alsItem must be updated and a new revision
  // recorded here. The system surfaces "RFM revision mismatch" alerts (see §5 alert logic).

  // ── Interval Definition ─────────────────────────────────────────────────────
  intervalType: alsIntervalType,

  intervalHours: v.optional(v.number()),
  // Life limit in airframe hours. Required when intervalType includes HOURS.
  // Measured from last replacement/overhaul, not from new.
  // For components tracked from new (some R44 items): this is the total life limit.

  intervalCalendarDays: v.optional(v.number()),
  // Calendar limit in days. Required when intervalType includes CALENDAR.
  // Measured from date of last replacement. e.g. 4380 days = 12 years.

  actionAtLimit: v.union(
    v.literal("REPLACE"),    // mandatory replacement at interval
    v.literal("OVERHAUL"),   // mandatory overhaul at interval (return to service with new interval)
    v.literal("INSPECT"),    // mandatory inspection at interval (may continue if serviceable)
    v.literal("RETIRE"),     // retirement only (no return to service, no overhaul path)
  ),
  // Specifies the required action when the limit is reached.
  // For dynamic components (blades, mast, bolts): typically REPLACE or RETIRE.

  eventType: v.optional(alsEventType),
  // Required when intervalType is EVENT_BASED or HOURS_AND_EVENT.
  // Specifies the event that triggers mandatory retirement or inspection.

  eventNotes: v.optional(v.string()),
  // Free-text notes on the event trigger. Required when eventType = OTHER.

  // ── Current Component Status ─────────────────────────────────────────────────
  // All time values are measured from the last replacement/installation of
  // the current component, not from aircraft new.

  componentInstalledAt: v.optional(v.string()),   // ISO date of last replacement/installation
  componentInstalledHours: v.optional(v.number()), // aircraft total hours at last installation
  // Note: to compute current component hours, calculate:
  //   currentAircraftHours - componentInstalledHours
  // The mutation updateAlsItemHours handles this calculation.

  currentComponentHours: v.optional(v.number()),
  // Hours accrued on this component since last installation.
  // Updated by updateAlsItemHours mutation when aircraft hours are logged.

  lastInspectionDate: v.optional(v.string()),      // ISO date of last compliance inspection
  lastInspectionHours: v.optional(v.number()),     // aircraft hours at last compliance inspection
  lastComplianceWorkOrderId: v.optional(v.id("workOrders")), // WO that documented last action

  // ── Next Due Computation ─────────────────────────────────────────────────────
  nextDueHours: v.optional(v.number()),
  // Aircraft total hours when this ALS item is next due.
  // Computed: componentInstalledHours + intervalHours
  // For INSPECT type: lastInspectionHours + intervalHours

  nextDueDate: v.optional(v.string()),
  // ISO date when this ALS item is next due by calendar.
  // Computed: componentInstalledAt + intervalCalendarDays

  // ── Alert Configuration ──────────────────────────────────────────────────────
  alertThresholdHours: v.optional(v.number()),
  // Hours before nextDueHours at which DUE_SOON status activates.
  // Default: 10 hours (configurable per item or per org).

  alertThresholdDays: v.optional(v.number()),
  // Days before nextDueDate at which DUE_SOON status activates.
  // Default: 30 days.

  // ── Compliance Status ────────────────────────────────────────────────────────
  status: alsComplianceStatus,
  // Managed by state machine (see §4.3). Never set directly by client.

  // ── Event History ────────────────────────────────────────────────────────────
  eventRecordedAt: v.optional(v.string()),    // ISO timestamp of the triggering event
  eventRecordedBy: v.optional(v.id("users")),  // user who recorded the event
  eventWorkOrderId: v.optional(v.id("workOrders")), // WO under which event was documented

  // ── Closure Fields ───────────────────────────────────────────────────────────
  // Set by closeAlsItemWithReplacement mutation. When status = REPLACED:
  replacementDate: v.optional(v.string()),         // ISO date of replacement
  replacementHours: v.optional(v.number()),        // aircraft hours at replacement
  replacedByUserId: v.optional(v.id("users")),     // IA who signed off replacement
  replacementWorkOrderId: v.optional(v.id("workOrders")), // WO documenting replacement
  replacementNotes: v.optional(v.string()),        // free-text notes on replacement
  successorAlsItemId: v.optional(v.id("alsItems")), // new alsItem created for replacement component

  // ── AD Cross-Reference ───────────────────────────────────────────────────────
  relatedAdNumber: v.optional(v.string()),
  // If an FAA AD exists that references or incorporates this ALS item.
  // For most R44 ALS items: this field is null (confirmed ALS-only).
  // When populated: the AD does not supersede the ALS; both apply.

  adCrossReferenceNote: v.optional(v.string()),
  // Explanation of the relationship between the AD and the ALS item.
  // e.g. "AD 2011-10-09 applies to governor batches manufactured before 2009.
  //        Standard governor overhaul interval for current-production units
  //        is ALS-only (R44-ALS-4.11)."

  // ── Audit Fields ─────────────────────────────────────────────────────────────
  createdAt: v.string(),              // ISO timestamp
  createdBy: v.id("users"),           // user who created the record
  updatedAt: v.string(),              // ISO timestamp of last update
  updatedBy: v.id("users"),           // user who made the last update
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  // Primary query index: list all ALS items for an aircraft within an org.
  // Required for ALS compliance dashboard query.

  .index("by_org_status", ["orgId", "status"])
  // Cross-aircraft status query: list all OVERDUE items across an org's fleet.
  // Used by DOM compliance dashboard for fleet-wide ALS alert panel.

  .index("by_aircraft_als_ref", ["aircraftId", "alsReference"])
  // Deduplication check: enforce one active record per ALS item per aircraft.
  // Also used to look up a specific ALS item by its reference code.

  .index("by_org_aircraft_status", ["orgId", "aircraftId", "status"])
  // Composite index for filtered dashboard queries:
  //   e.g. all OVERDUE items for a specific aircraft within an org.

  .index("by_next_due_hours", ["orgId", "nextDueHours"])
  // Scheduler index: used by the alert scheduler to find items approaching their hour limit.
  // Enables efficient "items due in the next N hours fleet-wide" queries.
;
```

---

### 4.3 Compliance State Machine

```
                        [CREATE]
                            │
                            ▼
                     ┌─────────────┐
                     │ WITHIN_LIMIT │◄──────────────────────────────┐
                     └──────┬──────┘                                │
                            │                                       │
            Hours/date approach alertThreshold                      │
                            │                                       │
                            ▼                                       │
                      ┌──────────┐                          [closeAlsItemWithReplacement]
                      │ DUE_SOON │                                   │
                      └────┬─────┘                          ┌───────┴───────┐
                           │                                │   REPLACED    │
         Hours/date exceed limit, or                        │  (closed)     │
         event trigger fires (blade                         └───────────────┘
         strike / overspeed / hard                          (new alsItem created
         landing)                                           with status WITHIN_LIMIT
                           │                                for replacement component)
                           ▼
                      ┌─────────┐
                      │ OVERDUE │
                      └────┬────┘
                           │
         Event-based retirement  ─────────────► ┌──────────┐
         (BLADE_STRIKE, OVERSPEED,               │ RETIRED  │
          HARD_LANDING requiring retirement)      │ (closed) │
                                                 └──────────┘

State Machine Rules:
───────────────────
1. WITHIN_LIMIT is the initial state on CREATE.
2. Status is NEVER set directly by a client mutation argument. Status is
   computed by the evaluateAlsStatus() helper based on current hours,
   current date, nextDueHours, nextDueDate, and alertThresholds.
3. Events (BLADE_STRIKE, etc.) immediately transition to OVERDUE regardless
   of current hours, via the recordAlsEvent mutation. If the event type
   mandates retirement (BLADE_STRIKE on a blade), the status goes directly
   to RETIRED without passing through OVERDUE.
4. REPLACED and RETIRED are terminal states for the current record.
   closeAlsItemWithReplacement creates a new alsItem record for the
   replacement component with status = WITHIN_LIMIT.
5. NOT_APPLICABLE does not exist in this state machine. It is excluded by
   schema design (not in the v.union). ALS items are mandatory for all
   aircraft of the type. No operator-side override path exists.
```

---

### 4.4 Relationship to `workOrders` and `aircraft` Tables

```
aircraft (1)
  ├── alsItems (*) — many ALS items per aircraft
  │     each alsItem has:
  │       aircraftId → aircraft._id
  │       lastComplianceWorkOrderId → workOrders._id (optional)
  │       replacementWorkOrderId → workOrders._id (optional, on REPLACED)
  │       eventWorkOrderId → workOrders._id (optional, on event)
  │       successorAlsItemId → alsItems._id (forward link to replacement record)
  │
  └── workOrders (*) — maintenance work orders
        ├── may link to alsItems via the alsItemIds array (see workOrders schema addition below)
        └── closeAlsItemWithReplacement mutation validates that the WO is in
            SIGNED or RTS_SIGNED state before accepting the closure

workOrders schema addition (to existing workOrders table):
  alsItemIds: v.optional(v.array(v.id("alsItems"))),
  // ALS items that were actioned during this work order.
  // Populated by closeAlsItemWithReplacement and recordAlsEvent.
  // Enables: "what ALS items did this work order close or document?"

organizations (1)
  └── alsItems (*) — all ALS items scoped to this org
        orgId → organizations._id (derived from auth, never from client args)
```

---

## 5. ALS Compliance Tracking Implementation

### 5.1 Convex Mutations

```typescript
// convex/als.ts

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getOrgId, assertPermission, assertOrgMatch } from "./authHelpers";
import { ConvexError } from "convex/values";

// ── Helper: Evaluate ALS Compliance Status ──────────────────────────────────

function evaluateAlsStatus(args: {
  currentComponentHours: number | undefined;
  nextDueHours: number | undefined;
  nextDueDate: string | undefined;
  alertThresholdHours: number;
  alertThresholdDays: number;
  intervalType: string;
}): "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" {
  const now = new Date();
  const {
    currentComponentHours,
    nextDueHours,
    nextDueDate,
    alertThresholdHours,
    alertThresholdDays,
    intervalType,
  } = args;

  let hoursStatus: "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" = "WITHIN_LIMIT";
  let calendarStatus: "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" = "WITHIN_LIMIT";

  // Evaluate hours limit
  if (
    nextDueHours !== undefined &&
    currentComponentHours !== undefined &&
    (intervalType === "HOURS" ||
      intervalType === "HOURS_OR_CALENDAR" ||
      intervalType === "HOURS_AND_EVENT")
  ) {
    if (currentComponentHours >= nextDueHours) {
      hoursStatus = "OVERDUE";
    } else if (currentComponentHours >= nextDueHours - alertThresholdHours) {
      hoursStatus = "DUE_SOON";
    }
  }

  // Evaluate calendar limit
  if (
    nextDueDate !== undefined &&
    (intervalType === "CALENDAR" || intervalType === "HOURS_OR_CALENDAR")
  ) {
    const dueDate = new Date(nextDueDate);
    const msPerDay = 86400000;
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / msPerDay;

    if (daysUntilDue <= 0) {
      calendarStatus = "OVERDUE";
    } else if (daysUntilDue <= alertThresholdDays) {
      calendarStatus = "DUE_SOON";
    }
  }

  // For HOURS_OR_CALENDAR: worst status wins (whichever first)
  if (hoursStatus === "OVERDUE" || calendarStatus === "OVERDUE") return "OVERDUE";
  if (hoursStatus === "DUE_SOON" || calendarStatus === "DUE_SOON") return "DUE_SOON";
  return "WITHIN_LIMIT";
}

// ── Mutation: createAlsItem ──────────────────────────────────────────────────

export const createAlsItem = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    alsReference: v.string(),           // e.g. "R44-ALS-4.3"
    componentName: v.string(),
    componentPartNumbers: v.optional(v.array(v.string())),
    componentSerialNumber: v.optional(v.string()),
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    regulatoryBasis: v.union(
      v.literal("ICA_ALS_PART27"),
      v.literal("ICA_ALS_PART29"),
      v.literal("ICA_ALS_PART23"),
    ),
    icaDocumentReference: v.string(),
    icaRevision: v.string(),
    intervalType: v.union(
      v.literal("HOURS"),
      v.literal("CALENDAR"),
      v.literal("HOURS_OR_CALENDAR"),
      v.literal("EVENT_BASED"),
      v.literal("HOURS_AND_EVENT"),
      v.literal("INSPECTION_INTERVAL"),
    ),
    intervalHours: v.optional(v.number()),
    intervalCalendarDays: v.optional(v.number()),
    actionAtLimit: v.union(
      v.literal("REPLACE"),
      v.literal("OVERHAUL"),
      v.literal("INSPECT"),
      v.literal("RETIRE"),
    ),
    eventType: v.optional(v.union(
      v.literal("BLADE_STRIKE"),
      v.literal("HARD_LANDING"),
      v.literal("OVERSPEED"),
      v.literal("OTHER"),
    )),
    componentInstalledAt: v.optional(v.string()),
    componentInstalledHours: v.optional(v.number()),
    currentComponentHours: v.optional(v.number()),
    alertThresholdHours: v.optional(v.number()),
    alertThresholdDays: v.optional(v.number()),
    relatedAdNumber: v.optional(v.string()),
    adCrossReferenceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance"); // DOM or QCM minimum

    // Verify aircraft belongs to this org
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new ConvexError("AIRCRAFT_NOT_FOUND");
    assertOrgMatch(aircraft, orgId, "AIRCRAFT_ORG_MISMATCH");

    // Deduplication: only one active (non-REPLACED, non-RETIRED) ALS item per
    // alsReference per aircraft. Multiple REPLACED/RETIRED records are allowed
    // (they form the component history chain).
    const existingActive = await ctx.db
      .query("alsItems")
      .withIndex("by_aircraft_als_ref", (q) =>
        q.eq("aircraftId", args.aircraftId).eq("alsReference", args.alsReference)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "REPLACED"),
          q.neq(q.field("status"), "RETIRED")
        )
      )
      .first();

    if (existingActive) {
      throw new ConvexError("ALS_ITEM_ALREADY_EXISTS: An active ALS item with this reference already exists for this aircraft. Use updateAlsItemHours to update hours.");
    }

    const now = new Date().toISOString();
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new ConvexError("UNAUTHENTICATED");
    const userRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), userId.subject))
      .first();
    if (!userRecord) throw new ConvexError("USER_NOT_FOUND");

    // Compute nextDueHours and nextDueDate
    const nextDueHours =
      args.componentInstalledHours !== undefined && args.intervalHours !== undefined
        ? args.componentInstalledHours + args.intervalHours
        : undefined;

    const nextDueDate =
      args.componentInstalledAt !== undefined && args.intervalCalendarDays !== undefined
        ? new Date(
            new Date(args.componentInstalledAt).getTime() +
              args.intervalCalendarDays * 86400000
          ).toISOString().split("T")[0]
        : undefined;

    // Evaluate initial status
    const status = evaluateAlsStatus({
      currentComponentHours: args.currentComponentHours,
      nextDueHours,
      nextDueDate,
      alertThresholdHours: args.alertThresholdHours ?? 10,
      alertThresholdDays: args.alertThresholdDays ?? 30,
      intervalType: args.intervalType,
    });

    const alsItemId = await ctx.db.insert("alsItems", {
      orgId,
      aircraftId: args.aircraftId,
      alsReference: args.alsReference,
      componentName: args.componentName,
      componentPartNumbers: args.componentPartNumbers,
      componentSerialNumber: args.componentSerialNumber,
      aircraftMake: args.aircraftMake,
      aircraftModel: args.aircraftModel,
      regulatoryBasis: args.regulatoryBasis,
      icaDocumentReference: args.icaDocumentReference,
      icaRevision: args.icaRevision,
      intervalType: args.intervalType,
      intervalHours: args.intervalHours,
      intervalCalendarDays: args.intervalCalendarDays,
      actionAtLimit: args.actionAtLimit,
      eventType: args.eventType,
      componentInstalledAt: args.componentInstalledAt,
      componentInstalledHours: args.componentInstalledHours,
      currentComponentHours: args.currentComponentHours,
      nextDueHours,
      nextDueDate,
      alertThresholdHours: args.alertThresholdHours ?? 10,
      alertThresholdDays: args.alertThresholdDays ?? 30,
      status,
      createdAt: now,
      createdBy: userRecord._id,
      updatedAt: now,
      updatedBy: userRecord._id,
    });

    return { alsItemId, status };
  },
});

// ── Mutation: updateAlsItemHours ─────────────────────────────────────────────

export const updateAlsItemHours = mutation({
  args: {
    alsItemId: v.id("alsItems"),
    aircraftCurrentHours: v.number(),
    // Provide current total aircraft hours; the mutation computes component hours.
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance");

    const item = await ctx.db.get(args.alsItemId);
    if (!item) throw new ConvexError("ALS_ITEM_NOT_FOUND");
    assertOrgMatch(item, orgId, "ALS_ITEM_ORG_MISMATCH");

    if (item.status === "REPLACED" || item.status === "RETIRED") {
      throw new ConvexError("ALS_ITEM_CLOSED: Cannot update hours on a closed ALS item.");
    }

    // Compute current component hours
    const currentComponentHours =
      item.componentInstalledHours !== undefined
        ? args.aircraftCurrentHours - item.componentInstalledHours
        : undefined;

    // Re-evaluate status
    const newStatus = evaluateAlsStatus({
      currentComponentHours,
      nextDueHours: item.nextDueHours,
      nextDueDate: item.nextDueDate,
      alertThresholdHours: item.alertThresholdHours ?? 10,
      alertThresholdDays: item.alertThresholdDays ?? 30,
      intervalType: item.intervalType,
    });

    const now = new Date().toISOString();
    const userId = await ctx.auth.getUserIdentity();
    const userRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), userId!.subject))
      .first();

    await ctx.db.patch(args.alsItemId, {
      currentComponentHours,
      status: newStatus,
      updatedAt: now,
      updatedBy: userRecord!._id,
    });

    return { alsItemId: args.alsItemId, currentComponentHours, status: newStatus };
  },
});

// ── Mutation: closeAlsItemWithReplacement ────────────────────────────────────

export const closeAlsItemWithReplacement = mutation({
  args: {
    alsItemId: v.id("alsItems"),
    replacementWorkOrderId: v.id("workOrders"),
    replacementDate: v.string(),          // ISO date
    replacementHours: v.number(),         // aircraft hours at replacement
    replacementNotes: v.optional(v.string()),
    // New component fields — create a successor alsItem for the replacement
    newComponentPartNumbers: v.optional(v.array(v.string())),
    newComponentSerialNumber: v.optional(v.string()),
    newIcaRevision: v.string(),          // confirm current RFM revision
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "sign_rts"); // IA-only: only an IA can close an ALS item

    const item = await ctx.db.get(args.alsItemId);
    if (!item) throw new ConvexError("ALS_ITEM_NOT_FOUND");
    assertOrgMatch(item, orgId, "ALS_ITEM_ORG_MISMATCH");

    if (item.status === "REPLACED" || item.status === "RETIRED") {
      throw new ConvexError("ALS_ITEM_ALREADY_CLOSED");
    }

    // Validate work order exists and is in a signed state
    const workOrder = await ctx.db.get(args.replacementWorkOrderId);
    if (!workOrder) throw new ConvexError("WORK_ORDER_NOT_FOUND");
    assertOrgMatch(workOrder, orgId, "WORK_ORDER_ORG_MISMATCH");
    if (!["SIGNED", "RTS_SIGNED"].includes(workOrder.status)) {
      throw new ConvexError("WORK_ORDER_NOT_SIGNED: ALS item closure requires a signed work order.");
    }

    const now = new Date().toISOString();
    const userId = await ctx.auth.getUserIdentity();
    const userRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), userId!.subject))
      .first();
    if (!userRecord) throw new ConvexError("USER_NOT_FOUND");

    // Compute new nextDueHours and nextDueDate for the replacement component
    const newNextDueHours =
      item.intervalHours !== undefined
        ? args.replacementHours + item.intervalHours
        : undefined;

    const newNextDueDate =
      item.intervalCalendarDays !== undefined
        ? new Date(
            new Date(args.replacementDate).getTime() +
              item.intervalCalendarDays * 86400000
          ).toISOString().split("T")[0]
        : undefined;

    // Create successor ALS item for the replacement component
    const successorId = await ctx.db.insert("alsItems", {
      orgId,
      aircraftId: item.aircraftId,
      alsReference: item.alsReference,   // same ALS reference code
      componentName: item.componentName,
      componentPartNumbers: args.newComponentPartNumbers ?? item.componentPartNumbers,
      componentSerialNumber: args.newComponentSerialNumber,
      aircraftMake: item.aircraftMake,
      aircraftModel: item.aircraftModel,
      regulatoryBasis: item.regulatoryBasis,
      icaDocumentReference: item.icaDocumentReference,
      icaRevision: args.newIcaRevision,  // confirm current revision at replacement
      intervalType: item.intervalType,
      intervalHours: item.intervalHours,
      intervalCalendarDays: item.intervalCalendarDays,
      actionAtLimit: item.actionAtLimit,
      eventType: item.eventType,
      componentInstalledAt: args.replacementDate,
      componentInstalledHours: args.replacementHours,
      currentComponentHours: 0,
      nextDueHours: newNextDueHours,
      nextDueDate: newNextDueDate,
      alertThresholdHours: item.alertThresholdHours,
      alertThresholdDays: item.alertThresholdDays,
      status: "WITHIN_LIMIT",
      lastComplianceWorkOrderId: args.replacementWorkOrderId,
      createdAt: now,
      createdBy: userRecord._id,
      updatedAt: now,
      updatedBy: userRecord._id,
    });

    // Close the current ALS item
    await ctx.db.patch(args.alsItemId, {
      status: "REPLACED",
      replacementDate: args.replacementDate,
      replacementHours: args.replacementHours,
      replacedByUserId: userRecord._id,
      replacementWorkOrderId: args.replacementWorkOrderId,
      replacementNotes: args.replacementNotes,
      successorAlsItemId: successorId,
      updatedAt: now,
      updatedBy: userRecord._id,
    });

    // Link the ALS item to the work order
    const existingAlsItemIds = workOrder.alsItemIds ?? [];
    await ctx.db.patch(args.replacementWorkOrderId, {
      alsItemIds: [...existingAlsItemIds, args.alsItemId],
    });

    return {
      closedAlsItemId: args.alsItemId,
      successorAlsItemId: successorId,
      newStatus: "WITHIN_LIMIT",
      newNextDueHours,
      newNextDueDate,
    };
  },
});

// ── Mutation: recordAlsEvent ─────────────────────────────────────────────────
// Records a triggering event (blade strike, hard landing, overspeed) and
// immediately transitions the affected ALS item(s) to OVERDUE or RETIRED.

export const recordAlsEvent = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    eventType: v.union(
      v.literal("BLADE_STRIKE"),
      v.literal("HARD_LANDING"),
      v.literal("OVERSPEED"),
      v.literal("OTHER"),
    ),
    eventNotes: v.optional(v.string()),
    eventWorkOrderId: v.optional(v.id("workOrders")),
    affectedAlsItemIds: v.array(v.id("alsItems")),
    // Caller specifies which ALS items are affected by this event.
    // For BLADE_STRIKE: typically tail rotor blade ALS item(s).
    // For HARD_LANDING: typically mast assembly ALS item.
    // For OVERSPEED: typically mast assembly + tail rotor ALS items.
    retireImmediately: v.boolean(),
    // If true: transition directly to RETIRED (component must be replaced before flight).
    // If false: transition to OVERDUE (component requires immediate inspection;
    //   airworthy determination made by IA post-inspection).
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "sign_rts"); // IA-only

    const now = new Date().toISOString();
    const userId = await ctx.auth.getUserIdentity();
    const userRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), userId!.subject))
      .first();
    if (!userRecord) throw new ConvexError("USER_NOT_FOUND");

    const results: Array<{ alsItemId: string; newStatus: string }> = [];

    for (const alsItemId of args.affectedAlsItemIds) {
      const item = await ctx.db.get(alsItemId);
      if (!item) throw new ConvexError(`ALS_ITEM_NOT_FOUND: ${alsItemId}`);
      assertOrgMatch(item, orgId, "ALS_ITEM_ORG_MISMATCH");

      if (item.status === "REPLACED" || item.status === "RETIRED") {
        // Already closed — skip silently (event may affect components being tracked separately)
        continue;
      }

      const newStatus = args.retireImmediately ? "RETIRED" : "OVERDUE";

      await ctx.db.patch(alsItemId, {
        status: newStatus,
        eventRecordedAt: now,
        eventRecordedBy: userRecord._id,
        eventWorkOrderId: args.eventWorkOrderId,
        eventType: args.eventType,
        eventNotes: args.eventNotes,
        updatedAt: now,
        updatedBy: userRecord._id,
      });

      results.push({ alsItemId, newStatus });
    }

    return { eventRecorded: true, affectedItems: results };
  },
});
```

---

### 5.2 ALS Compliance Dashboard Query

```typescript
// convex/als.ts (continued)

// ── Query: getAlsComplianceDashboard ────────────────────────────────────────

export const getAlsComplianceDashboard = query({
  args: {
    aircraftId: v.id("aircraft"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance");

    // Verify aircraft belongs to this org
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new ConvexError("AIRCRAFT_NOT_FOUND");
    assertOrgMatch(aircraft, orgId, "AIRCRAFT_ORG_MISMATCH");

    // Fetch all active (non-REPLACED, non-RETIRED) ALS items for this aircraft
    const allAlsItems = await ctx.db
      .query("alsItems")
      .withIndex("by_org_aircraft", (q) =>
        q.eq("orgId", orgId).eq("aircraftId", args.aircraftId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "REPLACED"),
          q.neq(q.field("status"), "RETIRED")
        )
      )
      .collect();

    const now = new Date();
    const msPerDay = 86400000;

    // Enrich each item with computed urgency fields
    const enrichedItems = allAlsItems.map((item) => {
      const hoursRemaining =
        item.nextDueHours !== undefined && item.currentComponentHours !== undefined
          ? item.nextDueHours - item.currentComponentHours
          : null;

      const daysRemaining =
        item.nextDueDate !== undefined
          ? Math.floor(
              (new Date(item.nextDueDate).getTime() - now.getTime()) / msPerDay
            )
          : null;

      const urgencyScore =
        item.status === "OVERDUE"
          ? 0
          : item.status === "DUE_SOON"
          ? 1
          : 2;

      return {
        ...item,
        hoursRemaining,
        daysRemaining,
        urgencyScore, // 0 = OVERDUE (most urgent), 2 = WITHIN_LIMIT
      };
    });

    // Sort by urgency: OVERDUE first, then DUE_SOON, then WITHIN_LIMIT.
    // Within each status group, sort by hoursRemaining ascending (most urgent first).
    enrichedItems.sort((a, b) => {
      if (a.urgencyScore !== b.urgencyScore) return a.urgencyScore - b.urgencyScore;
      if (a.hoursRemaining !== null && b.hoursRemaining !== null) {
        return a.hoursRemaining - b.hoursRemaining;
      }
      if (a.daysRemaining !== null && b.daysRemaining !== null) {
        return a.daysRemaining - b.daysRemaining;
      }
      return 0;
    });

    // Summary counts
    const summary = {
      overdue: enrichedItems.filter((i) => i.status === "OVERDUE").length,
      dueSoon: enrichedItems.filter((i) => i.status === "DUE_SOON").length,
      withinLimit: enrichedItems.filter((i) => i.status === "WITHIN_LIMIT").length,
      total: enrichedItems.length,
    };

    return {
      aircraftId: args.aircraftId,
      tailNumber: aircraft.tailNumber,
      aircraftMake: aircraft.make,
      aircraftModel: aircraft.model,
      summary,
      items: enrichedItems,
      generatedAt: now.toISOString(),
    };
  },
});

// ── Query: getFleetAlsAlerts (DOM Dashboard — Fleet-Wide) ────────────────────

export const getFleetAlsAlerts = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    await assertPermission(ctx, orgId, "view_compliance");

    // Fetch all OVERDUE and DUE_SOON items across the org's entire fleet
    const overdueItems = await ctx.db
      .query("alsItems")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", orgId).eq("status", "OVERDUE")
      )
      .collect();

    const dueSoonItems = await ctx.db
      .query("alsItems")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", orgId).eq("status", "DUE_SOON")
      )
      .collect();

    // Group by aircraft for the DOM dashboard panel
    const alertsByAircraft: Record<string, {
      tailNumber: string;
      overdue: typeof overdueItems;
      dueSoon: typeof dueSoonItems;
    }> = {};

    const aircraftCache: Record<string, { tailNumber: string }> = {};

    const populateAlerts = async (items: typeof overdueItems, key: "overdue" | "dueSoon") => {
      for (const item of items) {
        const aircraftIdStr = item.aircraftId.toString();
        if (!aircraftCache[aircraftIdStr]) {
          const aircraft = await ctx.db.get(item.aircraftId);
          aircraftCache[aircraftIdStr] = { tailNumber: aircraft?.tailNumber ?? "UNKNOWN" };
        }
        if (!alertsByAircraft[aircraftIdStr]) {
          alertsByAircraft[aircraftIdStr] = {
            tailNumber: aircraftCache[aircraftIdStr].tailNumber,
            overdue: [],
            dueSoon: [],
          };
        }
        alertsByAircraft[aircraftIdStr][key].push(item);
      }
    };

    await populateAlerts(overdueItems, "overdue");
    await populateAlerts(dueSoonItems, "dueSoon");

    return {
      orgId,
      totalOverdue: overdueItems.length,
      totalDueSoon: dueSoonItems.length,
      alertsByAircraft,
      generatedAt: new Date().toISOString(),
    };
  },
});
```

---

### 5.3 Alert Logic — Approaching and Exceeded Limits

```typescript
// convex/als_alerts.ts

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ── Internal: Scheduled ALS Status Evaluation ──────────────────────────────
// This internal mutation is scheduled by the Convex scheduler to run hourly.
// It re-evaluates all non-closed ALS items across all orgs and updates status.

export const evaluateAllAlsStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const msPerDay = 86400000;

    // Process all non-closed items
    // Note: In production, this would be paginated using Convex's pagination API
    // to avoid timeout on large fleets.
    const allActiveItems = await ctx.db
      .query("alsItems")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "REPLACED"),
          q.neq(q.field("status"), "RETIRED")
        )
      )
      .collect();

    for (const item of allActiveItems) {
      const newStatus = evaluateAlsStatusInternal({
        currentComponentHours: item.currentComponentHours,
        nextDueHours: item.nextDueHours,
        nextDueDate: item.nextDueDate,
        alertThresholdHours: item.alertThresholdHours ?? 10,
        alertThresholdDays: item.alertThresholdDays ?? 30,
        intervalType: item.intervalType,
        now,
        msPerDay,
      });

      if (newStatus !== item.status) {
        await ctx.db.patch(item._id, {
          status: newStatus,
          updatedAt: now.toISOString(),
        });

        // Fire DOM alert if transitioning to OVERDUE
        if (newStatus === "OVERDUE") {
          await ctx.scheduler.runAfter(0, internal.als_alerts.fireDomAlsAlert, {
            alsItemId: item._id,
            orgId: item.orgId,
            aircraftId: item.aircraftId,
            alertType: "ALS_OVERDUE",
            componentName: item.componentName,
            alsReference: item.alsReference,
          });
        }

        // Fire approaching-limit notification if transitioning to DUE_SOON
        if (newStatus === "DUE_SOON" && item.status === "WITHIN_LIMIT") {
          await ctx.scheduler.runAfter(0, internal.als_alerts.fireDomAlsAlert, {
            alsItemId: item._id,
            orgId: item.orgId,
            aircraftId: item.aircraftId,
            alertType: "ALS_DUE_SOON",
            componentName: item.componentName,
            alsReference: item.alsReference,
          });
        }
      }
    }

    return { evaluated: allActiveItems.length, timestamp: now.toISOString() };
  },
});

// ── Internal: Fire DOM ALS Alert ───────────────────────────────────────────

export const fireDomAlsAlert = internalMutation({
  args: {
    alsItemId: v.id("alsItems"),
    orgId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    alertType: v.union(v.literal("ALS_OVERDUE"), v.literal("ALS_DUE_SOON")),
    componentName: v.string(),
    alsReference: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert into the domAlerts table (existing infrastructure from Phase 17 WS17-G)
    // DOM dashboard will surface this as a persistent alert requiring acknowledgment.
    // For ALS_OVERDUE: red alert — cannot be cleared without linking a resolution WO.
    // For ALS_DUE_SOON: amber alert — informational, can be acknowledged.

    await ctx.db.insert("domAlerts", {
      orgId: args.orgId,
      alertType: args.alertType,
      severity: args.alertType === "ALS_OVERDUE" ? "RED" : "AMBER",
      title:
        args.alertType === "ALS_OVERDUE"
          ? `ALS OVERDUE: ${args.componentName} (${args.alsReference})`
          : `ALS DUE SOON: ${args.componentName} (${args.alsReference})`,
      body:
        args.alertType === "ALS_OVERDUE"
          ? `ALS item ${args.alsReference} — ${args.componentName} — has reached or exceeded its mandatory replacement/inspection interval. The aircraft may not be airworthy. Immediate action required.`
          : `ALS item ${args.alsReference} — ${args.componentName} — is approaching its mandatory replacement/inspection interval. Schedule maintenance.`,
      relatedEntityType: "ALS_ITEM",
      relatedEntityId: args.alsItemId,
      aircraftId: args.aircraftId,
      acknowledgedAt: undefined,
      acknowledgedBy: undefined,
      resolutionWorkOrderId: undefined,
      createdAt: new Date().toISOString(),
    });
  },
});

// ── Helper: evaluateAlsStatusInternal (same logic as client-side, no imports) ─

function evaluateAlsStatusInternal(args: {
  currentComponentHours: number | undefined;
  nextDueHours: number | undefined;
  nextDueDate: string | undefined;
  alertThresholdHours: number;
  alertThresholdDays: number;
  intervalType: string;
  now: Date;
  msPerDay: number;
}): "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" {
  const { currentComponentHours, nextDueHours, nextDueDate,
          alertThresholdHours, alertThresholdDays, intervalType, now, msPerDay } = args;

  let hoursStatus: "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" = "WITHIN_LIMIT";
  let calendarStatus: "WITHIN_LIMIT" | "DUE_SOON" | "OVERDUE" = "WITHIN_LIMIT";

  if (nextDueHours !== undefined && currentComponentHours !== undefined &&
      (intervalType === "HOURS" || intervalType === "HOURS_OR_CALENDAR" || intervalType === "HOURS_AND_EVENT")) {
    if (currentComponentHours >= nextDueHours) hoursStatus = "OVERDUE";
    else if (currentComponentHours >= nextDueHours - alertThresholdHours) hoursStatus = "DUE_SOON";
  }

  if (nextDueDate !== undefined &&
      (intervalType === "CALENDAR" || intervalType === "HOURS_OR_CALENDAR")) {
    const dueDate = new Date(nextDueDate);
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / msPerDay;
    if (daysUntilDue <= 0) calendarStatus = "OVERDUE";
    else if (daysUntilDue <= alertThresholdDays) calendarStatus = "DUE_SOON";
  }

  if (hoursStatus === "OVERDUE" || calendarStatus === "OVERDUE") return "OVERDUE";
  if (hoursStatus === "DUE_SOON" || calendarStatus === "DUE_SOON") return "DUE_SOON";
  return "WITHIN_LIMIT";
}

// ── Alert Summary ────────────────────────────────────────────────────────────
// Alert Logic Rules (for compliance documentation):
//
// 1. DUE_SOON (AMBER):
//    Hours: currentComponentHours ≥ (nextDueHours - alertThresholdHours)
//           Default alertThresholdHours = 10 hours
//    Calendar: today ≥ (nextDueDate - alertThresholdDays)
//              Default alertThresholdDays = 30 days
//    For HOURS_OR_CALENDAR: whichever limit triggers first, amber fires first.
//
// 2. OVERDUE (RED):
//    Hours: currentComponentHours ≥ nextDueHours
//    Calendar: today ≥ nextDueDate
//    Event: recordAlsEvent called with retireImmediately=false → OVERDUE
//    For HOURS_OR_CALENDAR: whichever limit is exceeded first → OVERDUE.
//
// 3. RETIRED (immediate, from event):
//    recordAlsEvent called with retireImmediately=true → RETIRED directly.
//    No OVERDUE intermediate for blade strike on blades: the component
//    is immediately unairworthy.
//
// 4. DOM alert persistence:
//    ALS_DUE_SOON (AMBER): DOM may acknowledge. Alert re-fires if status
//      remains DUE_SOON after 7 days without action.
//    ALS_OVERDUE (RED): DOM may NOT clear the alert without linking a
//      resolution work order (closeAlsItemWithReplacement provides the WO link).
//      This matches the pre-close checklist architecture (WS16-H / WS17-H).
//
// 5. RFM Revision Mismatch Alert:
//    If the Robinson R44 RFM revision recorded on any alsItem (icaRevision field)
//    differs from the RFM revision on file in the org's document registry,
//    a DOM alert is fired: "RFM REVISION CHANGE — REVIEW ALS INTERVALS."
//    This alert requires DOM acknowledgment and confirmation that intervals are
//    current. Alert type: ALS_RFM_REVISION_MISMATCH, severity: AMBER.
//    This logic is wired into the documentRegistry.updateRfmRevision mutation
//    (Phase 27 scope) and is documented here for completeness.
```

---

## 6. Robinson R44 ALS Seed Data

*The following seed data reflects the actual Airworthiness Limitations from the Robinson R44 Raven II Rotorcraft Flight Manual, Section 4, as validated by Tobias Ferreira. This data is intended for use in the `createAlsItem` mutation to populate the initial ALS tracking records for Lone Star Rotorcraft's R44 fleet.*

*Regulatory basis: 14 CFR §27.1529 — Instructions for Continued Airworthiness. All intervals are mandatory. No NOT_APPLICABLE path exists.*

*Life limits are shown as: [hours limit] hours OR [calendar limit], whichever occurs first.*

---

### 6.1 Main Rotor System

| ALS Ref | Component | Part Number(s) | Life Limit | Interval Type | Action | ALS-Only? | Notes |
|---|---|---|---|---|---|---|---|
| R44-ALS-4.1 | Main Rotor Blade Set | A015-6 / C016-4 / C016-7 (varies by variant) | 2,200 hours or 12 calendar years | HOURS_OR_CALENDAR | REPLACE | **Yes** | No corresponding FAA AD on primary interval. Blade set retired together. |
| R44-ALS-4.2 | Main Rotor Hub Assembly | A170-4 / C170-6 | 2,200 hours | HOURS | REPLACE | **Yes** | Hub retired with blade set at same interval. |
| R44-ALS-4.3 | Main Rotor Blade Retention Bolts | A020-2 / C020-2 | 2,200 hours or 12 calendar years | HOURS_OR_CALENDAR | REPLACE | **Yes** | **Sandra's finding from pre-onboarding call. No FAA AD exists. ALS-only mandatory replacement.** |
| R44-ALS-4.4 | Teeter Bolt and Teeter Bolt Nut | A021-2 / C021-5 | 2,200 hours or 12 calendar years | HOURS_OR_CALENDAR | REPLACE | **Yes** | Often overlooked. No AD. |
| R44-ALS-4.5 | Main Rotor Pitch Links | A094-2 | 2,200 hours | HOURS | REPLACE | **Yes** | Per pair. |
| R44-ALS-4.6 | Main Rotor Pitch Link Bearings | (per pitch link assembly) | 2,200 hours | HOURS | REPLACE | **Yes** | Replaced with pitch links. |
| R44-ALS-4.7 | Swashplate Assembly (rotating plate) | A191-1 / C191-3 | 2,200 hours | HOURS | OVERHAUL | **Yes** | Rotating plate only. |
| R44-ALS-4.8 | Swashplate Assembly (stationary plate) | A190-1 | 2,200 hours | HOURS | INSPECT | **Yes** | Inspect; replace if worn beyond limits. |

---

### 6.2 Tail Rotor System

| ALS Ref | Component | Part Number(s) | Life Limit | Interval Type | Action | ALS-Only? | Notes |
|---|---|---|---|---|---|---|---|
| R44-ALS-4.9 | Tail Rotor Blade Set | C162-1 / C162-2 | 2,200 hours or 12 calendar years | HOURS_OR_CALENDAR | REPLACE | **Yes** | Also subject to immediate retirement on blade strike event. |
| R44-ALS-4.10 | Tail Rotor Hub Assembly | C165-1 | 2,200 hours | HOURS | REPLACE | **Yes** | |
| R44-ALS-4.10E | Tail Rotor Blade — Event: Blade Strike | C162-1 / C162-2 | Immediate upon blade strike contact | EVENT_BASED | RETIRE | **Yes** | Event-based trigger. recordAlsEvent(BLADE_STRIKE, retireImmediately=true). |

---

### 6.3 Main Rotor Mast and Drive System

| ALS Ref | Component | Part Number(s) | Life Limit | Interval Type | Action | ALS-Only? | Notes |
|---|---|---|---|---|---|---|---|
| R44-ALS-4.11 | Main Rotor Mast Assembly | A046-3 / C046-6 | 2,200 hours | HOURS | REPLACE | **Yes** | Also subject to mandatory inspection on hard landing or overspeed event. |
| R44-ALS-4.11E | Main Rotor Mast — Event: Hard Landing | A046-3 / C046-6 | Immediate upon hard landing | EVENT_BASED | INSPECT | **Yes** | recordAlsEvent(HARD_LANDING, retireImmediately=false). IA determines airworthy post-inspection. |
| R44-ALS-4.11F | Main Rotor Mast — Event: Overspeed | A046-3 / C046-6 | Immediate upon overspeed | EVENT_BASED | INSPECT | **Yes** | recordAlsEvent(OVERSPEED, retireImmediately=false). |
| R44-ALS-4.12 | Main Drive Belt | B168-7 / C168-11 | 2,200 hours or 12 calendar years | HOURS_OR_CALENDAR | REPLACE | **Yes** | **Frequently missed by AD-only tracking. No AD on belt replacement interval.** |
| R44-ALS-4.13 | Idler Pulley Assembly | A176-3 / C176-5 | 2,200 hours | HOURS | REPLACE | **Yes** | |
| R44-ALS-4.14 | Jackshaft Assembly | C096-2 | 2,200 hours | HOURS | REPLACE | **Yes** | |
| R44-ALS-4.15 | Tail Rotor Drive Shaft | C084-1 / C084-2 | 2,200 hours | HOURS | INSPECT | **Yes** | Inspect for cracks, corrosion; replace if required. |

---

### 6.4 Engine

| ALS Ref | Component | Part Number(s) | Life Limit | Interval Type | Action | ALS-Only? | Notes |
|---|---|---|---|---|---|---|---|
| R44-ALS-4.16 | Engine (Lycoming O-540-F1B5) | As delivered | 2,200 hours (Robinson ALS) or per Lycoming TBO (SB 240P), whichever first | HOURS_OR_CALENDAR | OVERHAUL | **Lycoming manufacturer + Robinson ALS** | Lycoming TBO is 2,000 hours via SB 240P. Robinson ALS specifies 2,200 hours max. Lycoming TBO governs. Both are mandatory; the more restrictive (Lycoming 2,000 hrs) prevails. |
| R44-ALS-4.17 | Engine Governor (Woodward or Lycoming) | Varies | 2,200 hours (standard interval); batches before 2009 may also be subject to AD 2011-10-09 | HOURS | OVERHAUL | **ALS primary; some batches also AD** | See § 3.3 for AD cross-reference. |

---

### 6.5 Cyclic and Collective Controls

| ALS Ref | Component | Part Number(s) | Life Limit | Interval Type | Action | ALS-Only? | Notes |
|---|---|---|---|---|---|---|---|
| R44-ALS-4.18 | Cyclic Control Tube Joints (selected) | A080-series | 2,200 hours | HOURS | INSPECT | **Yes** | Specific joints identified in RFM ALS table; not all cyclic joints. |
| R44-ALS-4.19 | Collective Control Bearings (selected) | A075-series | 2,200 hours | HOURS | INSPECT | **Yes** | Specific bearings per RFM ALS table. |

---

### 6.6 RFM Currency

| ALS Ref | Item | Life Limit | Interval Type | Action | Notes |
|---|---|---|---|---|---|
| R44-ALS-4.20 | Rotorcraft Flight Manual — edition currency | Current revision must be on aircraft at all times | Not time-based — event-based on RFM revision | Confirm current edition | Not a component replacement item. Tracked as a document currency requirement. Triggers RFM_REVISION_MISMATCH alert when Robinson issues a new revision. |

---

### 6.7 Seed Data Summary

| Category | ALS Item Count | ALS-Only (No AD) | Has AD Crossref | Event-Based Triggers |
|---|---|---|---|---|
| Main Rotor System | 8 | 8 | 0 | 0 |
| Tail Rotor System | 3 | 3 | 0 | 1 (blade strike) |
| Mast and Drive System | 7 | 7 | 0 | 2 (hard landing, overspeed) |
| Engine | 2 | 0 | 2 | 0 |
| Controls | 2 | 2 | 0 | 0 |
| RFM Currency | 1 | 1 | 0 | 0 (revision-triggered) |
| **Total** | **23** | **21** | **2** | **3** |

**21 out of 23 R44 ALS items have no corresponding FAA AD.** An AD-database-only MRO tool provides compliance coverage for 2 out of 23 mandatory maintenance items on the Robinson R44 Raven II.

---

## 7. Cilla Oduya — Test Plan + Execution

### 7.1 Coverage Matrix

| Feature Surface | Test Cases | Coverage |
|---|---|---|
| Create ALS item — hours-only | TC-ALS-001 | Create path, hours-only intervalType |
| Create ALS item — hours or calendar | TC-ALS-002 | Create path, dual-limit intervalType |
| Create ALS item — event-based | TC-ALS-003 | Create path, event-triggered items |
| Status transition: WITHIN_LIMIT → DUE_SOON → OVERDUE | TC-ALS-004 | Hours-based status state machine |
| Event trigger: blade strike → OVERDUE or RETIRED | TC-ALS-005 | Event-based status transition |
| Component replacement: OVERDUE → REPLACED + successor created | TC-ALS-006 | Closure path, chain continuity |
| Due-list query: OVERDUE and DUE_SOON items for aircraft | TC-ALS-007 | Dashboard query, urgency sort |
| Org isolation: cross-org ALS item visibility blocked | TC-ALS-008 | Multi-org isolation |
| No NOT_APPLICABLE path: schema validation | TC-ALS-009 | Schema enforcement, compliance gate |
| RFM revision change: DOM alert surfaced | TC-ALS-010 | Revision mismatch alert logic |

---

### 7.2 Test Case Execution

---

#### TC-ALS-001: Create ALS Item — Hours Only Interval

**Test ID:** TC-ALS-001  
**Description:** Create an `alsItem` with `intervalType = HOURS` using the `createAlsItem` mutation.  
**Preconditions:** Aircraft `N44R44` (Robinson R44 Raven II) exists in org `org_lone_star`. Authenticated user has `view_compliance` permission.  
**Input:**
```typescript
{
  aircraftId: "N44R44_id",
  alsReference: "R44-ALS-4.2",
  componentName: "Main Rotor Hub Assembly",
  componentPartNumbers: ["A170-4"],
  aircraftMake: "Robinson Helicopter Company",
  aircraftModel: "R44 Raven II",
  regulatoryBasis: "ICA_ALS_PART27",
  icaDocumentReference: "R44 Raven II RFM Section 4 (ALS), ¶4.2",
  icaRevision: "Revision 5, 2023-09-01",
  intervalType: "HOURS",
  intervalHours: 2200,
  actionAtLimit: "REPLACE",
  componentInstalledAt: "2022-01-15",
  componentInstalledHours: 1200,
  currentComponentHours: 280,
  alertThresholdHours: 10,
}
```
**Expected:**
- Record inserted with `status = "WITHIN_LIMIT"` (280 hours used of 2200 remaining = 1920 hours to go; >> 10-hour alert threshold)
- `nextDueHours = 1200 + 2200 = 3400`
- `orgId` derived from auth (not from args)
- Return: `{ alsItemId: <id>, status: "WITHIN_LIMIT" }`

**Actual:**
- Record inserted: ✅
- `status = "WITHIN_LIMIT"`: ✅
- `nextDueHours = 3400`: ✅
- `orgId` = `org_lone_star` (from auth context): ✅
- Return object present: ✅

**Result: ✅ PASS**

---

#### TC-ALS-002: Create ALS Item — Hours or Calendar (Whichever First)

**Test ID:** TC-ALS-002  
**Description:** Create an `alsItem` with `intervalType = HOURS_OR_CALENDAR`.  
**Input:**
```typescript
{
  aircraftId: "N44R44_id",
  alsReference: "R44-ALS-4.3",
  componentName: "Main Rotor Blade Retention Bolts",
  componentPartNumbers: ["A020-2", "C020-2"],
  aircraftMake: "Robinson Helicopter Company",
  aircraftModel: "R44 Raven II",
  regulatoryBasis: "ICA_ALS_PART27",
  icaDocumentReference: "R44 Raven II RFM Section 4 (ALS), ¶4.3",
  icaRevision: "Revision 5, 2023-09-01",
  intervalType: "HOURS_OR_CALENDAR",
  intervalHours: 2200,
  intervalCalendarDays: 4380,   // 12 years
  actionAtLimit: "REPLACE",
  componentInstalledAt: "2022-01-15",
  componentInstalledHours: 1200,
  currentComponentHours: 280,
  alertThresholdHours: 10,
  alertThresholdDays: 30,
}
```
**Expected:**
- `nextDueHours = 3400`
- `nextDueDate = "2034-01-15"` (12 years from installation)
- `status = "WITHIN_LIMIT"` (neither limit approached)

**Actual:**
- `nextDueHours = 3400`: ✅
- `nextDueDate = "2034-01-15"`: ✅
- `status = "WITHIN_LIMIT"`: ✅

**Result: ✅ PASS**

---

#### TC-ALS-003: Create ALS Item — Event-Based (Blade Strike)

**Test ID:** TC-ALS-003  
**Description:** Create an `alsItem` for the tail rotor blade with `intervalType = EVENT_BASED`.  
**Input:**
```typescript
{
  aircraftId: "N44R44_id",
  alsReference: "R44-ALS-4.10E",
  componentName: "Tail Rotor Blade — Event: Blade Strike",
  componentPartNumbers: ["C162-1", "C162-2"],
  aircraftMake: "Robinson Helicopter Company",
  aircraftModel: "R44 Raven II",
  regulatoryBasis: "ICA_ALS_PART27",
  icaDocumentReference: "R44 Raven II RFM Section 4 (ALS), ¶4.10 (event protocol)",
  icaRevision: "Revision 5, 2023-09-01",
  intervalType: "EVENT_BASED",
  actionAtLimit: "RETIRE",
  eventType: "BLADE_STRIKE",
  componentInstalledAt: "2022-01-15",
  componentInstalledHours: 1200,
  currentComponentHours: 280,
}
```
**Expected:**
- `status = "WITHIN_LIMIT"` (no event recorded yet)
- `nextDueHours = null` (not applicable for EVENT_BASED)
- `nextDueDate = null`
- `intervalHours = null`

**Actual:**
- `status = "WITHIN_LIMIT"`: ✅
- `nextDueHours = undefined`: ✅
- `nextDueDate = undefined`: ✅

**Result: ✅ PASS**

---

#### TC-ALS-004: Status Transitions — WITHIN_LIMIT → DUE_SOON → OVERDUE

**Test ID:** TC-ALS-004  
**Description:** Simulate hours accumulation through the status state machine.  
**Preconditions:** ALS item R44-ALS-4.3 exists with:
- `componentInstalledHours = 1200`
- `intervalHours = 2200`
- `nextDueHours = 3400`
- `alertThresholdHours = 10`
- `status = "WITHIN_LIMIT"`
- `currentComponentHours = 280` (aircraft at 1480 total)

**Step 1:** `updateAlsItemHours({ aircraftCurrentHours: 3380 })`
- Expected: `currentComponentHours = 3380 - 1200 = 2180`; `status = "DUE_SOON"` (2180 ≥ 3400 - 10 = 3390? No — wait: nextDueHours=3400, aircraft hours 3380, componentHours=3380-1200=2180, nextDueHours is 2200 (component hours), so: 2180 ≥ 2200-10 = 2190? No, not yet — just past 2190 threshold test.)

*Correction — the test uses component hours vs. interval hours:*  
`currentComponentHours = aircraftCurrentHours - componentInstalledHours = 3385 - 1200 = 2185`  
`alertThreshold = 2200 - 10 = 2190`  
→ 2185 < 2190, still WITHIN_LIMIT.

**Step 1 (revised):** `updateAlsItemHours({ aircraftCurrentHours: 3392 })`
- `currentComponentHours = 3392 - 1200 = 2192`
- `2192 ≥ 2190 (2200 - 10)` → DUE_SOON
- Expected: `status = "DUE_SOON"` ✅

**Step 2:** `updateAlsItemHours({ aircraftCurrentHours: 3400 })`
- `currentComponentHours = 3400 - 1200 = 2200`
- `2200 ≥ 2200` → OVERDUE
- Expected: `status = "OVERDUE"` ✅; DOM alert `ALS_OVERDUE` fired ✅

**Actual:**
- Step 1: `status = "DUE_SOON"` at aircraft hours 3392: ✅; DOM amber alert `ALS_DUE_SOON` inserted: ✅
- Step 2: `status = "OVERDUE"` at aircraft hours 3400: ✅; DOM red alert `ALS_OVERDUE` inserted: ✅
- Red alert cannot be cleared without resolution WO (tested in TC-ALS-006): ✅

**Result: ✅ PASS**

---

#### TC-ALS-005: Event Trigger — Blade Strike → RETIRED Immediately

**Test ID:** TC-ALS-005  
**Description:** Record a blade strike event on the R44 tail rotor blade. Expect immediate RETIRED transition.  
**Preconditions:** ALS item R44-ALS-4.10E exists with `status = "WITHIN_LIMIT"`. Work order `WO-LSR-007` is in `SIGNED` state (post-incident ground inspection WO).

**Input to `recordAlsEvent`:**
```typescript
{
  aircraftId: "N44R44_id",
  eventType: "BLADE_STRIKE",
  eventNotes: "Left tail rotor blade contacted ground vegetation during confined area approach. Blade tip damage observed. Aircraft grounded.",
  eventWorkOrderId: "WO-LSR-007_id",
  affectedAlsItemIds: ["R44-ALS-4.10E_id"],
  retireImmediately: true,   // blade strike on a blade = immediate retirement, no inspection path
}
```
**Expected:**
- `status = "RETIRED"` on R44-ALS-4.10E ✅
- `eventRecordedAt` set ✅
- `eventRecordedBy` = IA user ID ✅
- `eventWorkOrderId` = WO-LSR-007 ✅
- Auth check: only `sign_rts` (IA) can call `recordAlsEvent` ✅

**Actual:**
- `status = "RETIRED"`: ✅
- All event fields populated: ✅
- A&P mechanic (no `sign_rts`) attempted the same call → `PERMISSION_DENIED`: ✅

**Result: ✅ PASS**

---

#### TC-ALS-006: Component Replacement — OVERDUE → REPLACED + Successor Created

**Test ID:** TC-ALS-006  
**Description:** Close an OVERDUE ALS item with a replacement work order. Verify successor record is created.  
**Preconditions:** R44-ALS-4.3 (Main Rotor Blade Retention Bolts) is at `status = "OVERDUE"`. Work order `WO-LSR-008` (ALS compliance WO: bolt replacement) is `RTS_SIGNED`.

**Input to `closeAlsItemWithReplacement`:**
```typescript
{
  alsItemId: "R44-ALS-4.3_id",
  replacementWorkOrderId: "WO-LSR-008_id",
  replacementDate: "2026-03-01",
  replacementHours: 3402,    // aircraft hours at replacement
  newComponentPartNumbers: ["C020-2"],
  newIcaRevision: "Revision 5, 2023-09-01",
  replacementNotes: "Replaced per R44 ALS ¶4.3 (2200-hour interval). Robinson P/N C020-2 installed. Serviceable tag on file.",
}
```
**Expected:**
- Original R44-ALS-4.3 record: `status = "REPLACED"` ✅
- Successor `alsItems` record created:
  - `alsReference = "R44-ALS-4.3"` (same reference) ✅
  - `componentInstalledHours = 3402` ✅
  - `componentInstalledAt = "2026-03-01"` ✅
  - `currentComponentHours = 0` ✅
  - `nextDueHours = 3402 + 2200 = 5602` ✅
  - `nextDueDate = "2038-03-01"` (12 years) ✅
  - `status = "WITHIN_LIMIT"` ✅
- Original record: `successorAlsItemId` points to successor ✅
- Work order `WO-LSR-008` gains `alsItemIds` containing R44-ALS-4.3 ID ✅
- Auth: A&P with no `sign_rts` → `PERMISSION_DENIED` ✅
- Auth: Unsigning WO (status `OPEN`) passed as replacementWorkOrderId → `WORK_ORDER_NOT_SIGNED` error ✅

**Actual:** All expected conditions met. ✅

**Result: ✅ PASS**

---

#### TC-ALS-007: Due-List Query — Dashboard Returns OVERDUE and DUE_SOON Items Sorted by Urgency

**Test ID:** TC-ALS-007  
**Description:** `getAlsComplianceDashboard` for an aircraft with mixed ALS statuses returns items sorted by urgency.  
**Preconditions:** Aircraft `N44R44` has 5 ALS items:
- Item A: `status = "OVERDUE"`, `hoursRemaining = -5` (5 hours past limit)
- Item B: `status = "DUE_SOON"`, `hoursRemaining = 3`
- Item C: `status = "DUE_SOON"`, `hoursRemaining = 8`
- Item D: `status = "WITHIN_LIMIT"`, `hoursRemaining = 400`
- Item E: `status = "WITHIN_LIMIT"`, `hoursRemaining = 850`

**Expected sort order:** A, B, C, D, E (OVERDUE first, then DUE_SOON sorted by hoursRemaining asc, then WITHIN_LIMIT)

**Expected summary:**
```json
{
  "overdue": 1,
  "dueSoon": 2,
  "withinLimit": 2,
  "total": 5
}
```

**Actual:** Sort order: A, B, C, D, E ✅; summary counts match ✅; `hoursRemaining` and `daysRemaining` computed fields present ✅.

**Result: ✅ PASS**

---

#### TC-ALS-008: Org Isolation — Cross-Org ALS Item Access Blocked

**Test ID:** TC-ALS-008  
**Description:** ALS items created in org_lone_star are not visible to org_skyline.  
**Preconditions:** org_lone_star has R44 ALS items. org_skyline has no R44 aircraft.

**Step 1:** Authenticate as org_skyline DOM. Call `getAlsComplianceDashboard` with an `aircraftId` belonging to org_lone_star.
- Expected: `ORG_ISOLATION_VIOLATION` (assertOrgMatch fires on aircraft record)
- Actual: `ORG_ISOLATION_VIOLATION` ✅

**Step 2:** Authenticate as org_skyline DOM. Call `getFleetAlsAlerts`.
- Expected: Returns zero alerts (no ALS items in org_skyline)
- Actual: Empty fleet alert response ✅ (no org_lone_star data visible)

**Step 3:** org_skyline DOM attempts `updateAlsItemHours` on an org_lone_star alsItem ID.
- Expected: `ALS_ITEM_ORG_MISMATCH`
- Actual: `ALS_ITEM_ORG_MISMATCH` ✅

**Result: ✅ PASS**

---

#### TC-ALS-009: No NOT_APPLICABLE Path — Schema Validation

**Test ID:** TC-ALS-009  
**Description:** Verify that the `status` field's `v.union` does not include `"NOT_APPLICABLE"` and that no mutation accepts `NOT_APPLICABLE` as a status.

**Step 1:** Inspect the `alsItems` table schema definition.  
- Verify: `v.union(v.literal("WITHIN_LIMIT"), v.literal("DUE_SOON"), v.literal("OVERDUE"), v.literal("REPLACED"), v.literal("RETIRED"))` — no `NOT_APPLICABLE` literal.  
- Actual: `NOT_APPLICABLE` absent from schema definition. ✅  
- TypeScript type check: passing `status: "NOT_APPLICABLE"` to any mutation → TypeScript compile error. ✅

**Step 2:** Attempt to call `ctx.db.patch(alsItemId, { status: "NOT_APPLICABLE" })` via a test mutation.  
- Expected: Convex runtime rejects the write (schema validation).  
- Actual: `Validator error: Value does not match the schema for field 'status'.` ✅

**Step 3:** Verify that `createAlsItem` mutation has no `status` field in its `args` definition (status is computed internally, never client-supplied).  
- Actual: `status` is absent from mutation args. ✅

**Result: ✅ PASS**

---

#### TC-ALS-010: RFM Revision Change — DOM Alert Surfaced

**Test ID:** TC-ALS-010  
**Description:** Verify that when an RFM revision change is recorded, existing `alsItems` retain their original `icaRevision` value and a DOM alert is surfaced indicating a mismatch.

*Note: The `documentRegistry.updateRfmRevision` mutation is Phase 27 scope. This test validates the data model's revision tracking field and the alert interface contract.*

**Step 1:** Verify ALS item for R44-ALS-4.3 has `icaRevision = "Revision 5, 2023-09-01"`.  
- Actual: `icaRevision` field present and populated on all seed data records. ✅

**Step 2:** Simulate a new RFM revision (Revision 6) being recorded.  
- Existing ALS items retain `icaRevision = "Revision 5, 2023-09-01"`.  
- `fireDomAlsAlert` called with `alertType: "ALS_RFM_REVISION_MISMATCH"`.  
- Expected: DOM alert appears in domAlerts table with severity AMBER, referencing the specific ALS item and noting the revision mismatch.  
- Actual: Alert inserted ✅; `icaRevision` on existing alsItems unchanged ✅ (DOM must review and confirm intervals before updating).

**Step 3:** DOM acknowledges alert and updates `icaRevision` on each affected ALS item to Revision 6 after reviewing the new RFM.  
- `updateAlsItem` mutation (DOM-only action): sets `icaRevision` to "Revision 6, 2025-12-01" on each confirmed item.  
- Alert cleared on acknowledgment.  
- Actual: Update path works; acknowledgment clears alert. ✅

**Result: ✅ PASS**

---

### 7.3 Test Summary

| Test Case | Description | Result |
|---|---|---|
| TC-ALS-001 | Create ALS item — hours only | ✅ PASS |
| TC-ALS-002 | Create ALS item — hours or calendar | ✅ PASS |
| TC-ALS-003 | Create ALS item — event-based (blade strike) | ✅ PASS |
| TC-ALS-004 | Status transitions: WITHIN_LIMIT → DUE_SOON → OVERDUE | ✅ PASS |
| TC-ALS-005 | Event trigger: blade strike → RETIRED immediately | ✅ PASS |
| TC-ALS-006 | Component replacement: OVERDUE → REPLACED + successor | ✅ PASS |
| TC-ALS-007 | Due-list query: urgency sort, summary counts | ✅ PASS |
| TC-ALS-008 | Org isolation: cross-org access blocked | ✅ PASS |
| TC-ALS-009 | No NOT_APPLICABLE path: schema validation | ✅ PASS |
| TC-ALS-010 | RFM revision change: DOM alert surfaced | ✅ PASS |

**Total: 10/10 PASS. Zero failures.**

**Cilla Oduya QA Sign-Off: ✅ PASS — all 10 ALS test cases.**  
*The `alsItems` data model is structurally sound, the state machine is correctly enforced, org isolation is confirmed, and the compliance-critical NOT_APPLICABLE exclusion is schema-validated.*

---

## 8. Marcus Webb — Part 27.1529 Compliance Review

### 8.1 Regulatory Basis

14 CFR §27.1529 — Instructions for Continued Airworthiness (Rotorcraft):

> *"The applicant must prepare Instructions for Continued Airworthiness in accordance with appendix A of this part that are acceptable to the Administrator. The instructions may be incomplete at type certification if a program exists to ensure their completion prior to delivery of the first rotorcraft or issuance of a standard certificate of airworthiness, whichever occurs first."*

14 CFR Part 27, Appendix A — Instructions for Continued Airworthiness:

> *"A27.4(b) Airworthiness Limitations Section. The Instructions for Continued Airworthiness must contain a section titled Airworthiness Limitations that is segregated and clearly distinguishable from the rest of the document. This section must set forth each mandatory replacement time, structural inspection interval, and related structural inspection procedure required for type certification. If the Instructions for Continued Airworthiness consist of multiple documents, the section required by this paragraph must be included in the principal maintenance instructions document."*

14 CFR §43.16 — Airworthiness Limitations:

> *"Each person performing an inspection or other maintenance specified in an Airworthiness Limitations section of a manufacturer's maintenance manual or Instructions for Continued Airworthiness shall perform the inspection or other maintenance in accordance with that section, or in accordance with operations specifications approved by the Administrator."*

**The regulatory chain is clear:** The manufacturer (Robinson) is required to provide an ALS (§27.1529 + Appendix A). The ALS contains mandatory replacement times with FAA-approved status. Maintenance performed on the aircraft must comply with the ALS (§43.16). An operator who tracks AD compliance only — and ignores the ALS — is operating an aircraft whose maintenance is not in accordance with its Instructions for Continued Airworthiness. This is an airworthiness deficiency regardless of whether an AD has been issued.

---

### 8.2 Review of `alsItems` Schema Against ICA Requirements

| ICA Requirement (§27.1529 / Appendix A27.4) | `alsItems` Field(s) | Status |
|---|---|---|
| Mandatory replacement time for each component | `intervalHours`, `intervalCalendarDays`, `actionAtLimit` | ✅ Present |
| Structural inspection interval | `intervalType = INSPECTION_INTERVAL`, `intervalHours` | ✅ Present |
| Regulatory basis identified | `regulatoryBasis = ICA_ALS_PART27` | ✅ Present |
| Document reference (which edition of ICA) | `icaDocumentReference`, `icaRevision` | ✅ Present |
| Current compliance status per component | `status` (state machine) | ✅ Present |
| History chain (what replaced what, when, at what hours) | `replacementWorkOrderId`, `lastComplianceWorkOrderId`, `successorAlsItemId` | ✅ Present |
| Aircraft-specific tracking (per tail number) | `aircraftId` foreign key | ✅ Present |
| No NOT_APPLICABLE path (all ALS items mandatory for type) | `NOT_APPLICABLE` excluded from `status` union | ✅ Confirmed |
| Event-based triggers (blade strike, hard landing, overspeed) | `intervalType = EVENT_BASED`, `eventType`, `recordAlsEvent` mutation | ✅ Present |
| Org isolation (one org's compliance data not visible to another) | `orgId` on every record, derived from auth, not client args | ✅ Confirmed |
| Revision tracking (ICA may be updated by manufacturer) | `icaRevision` field, RFM revision mismatch alert | ✅ Present |

---

### 8.3 Review of Compliance State Machine Against §43.16

The state machine enforces the following §43.16-required behaviors:

1. **Mandatory action at limit:** Status transitions to OVERDUE when the limit is reached. The DOM cannot clear an OVERDUE ALS alert without linking a resolution work order (`closeAlsItemWithReplacement`). This enforces the §43.16 requirement that maintenance is performed in accordance with the ALS — it prevents the DOM from simply acknowledging a limit exceedance without documenting the corrective action.

2. **No AMOC equivalent:** The schema has no `AMOC`, `DEFERRED`, or equivalent override mechanism for ALS items. This is correct. Under §43.16, the operator must perform the maintenance per the ALS or per operations specifications approved by the Administrator. The software does not provide an unauthorized deferral path.

3. **Event-based retirement enforcement:** `recordAlsEvent` with `retireImmediately = true` transitions directly to RETIRED, bypassing OVERDUE. This is the correct protocol for primary flight-critical component events (blade strike on a blade). The component is not airworthy; it cannot be inspected and returned to service without replacement.

4. **IA-only closure:** `closeAlsItemWithReplacement` and `recordAlsEvent` require `sign_rts` permission (IA minimum). Under §43.7, ALS compliance actions must be performed and signed off by certificated maintenance personnel. The permission gate enforces this.

---

### 8.4 Compliance Attestation

I have reviewed the `alsItems` data model (schema definition in §4.2), the compliance state machine (§4.3), the Convex mutation implementations (§5.1), the dashboard query (§5.2), and the alert logic (§5.3). I have also reviewed the Robinson R44 Raven II RFM Section 4 (ALS), the FAA AD database cross-reference (§3.3), and Tobias Ferreira's field interview validation (§2.6).

**Findings:**

1. **The `alsItems` data model correctly implements 14 CFR §27.1529 ICA tracking requirements.** The required fields are present: mandatory replacement times, interval types, regulatory basis, document reference with revision tracking, and component-level status.

2. **The NOT_APPLICABLE exclusion is correct and mandatory.** ALS items under §27.1529 apply to all aircraft of the covered type. The schema correctly excludes any NOT_APPLICABLE state. A shop cannot mark an R44 ALS item as not applicable to their R44. This is not a product limitation — it is the correct regulatory posture.

3. **The event-based trigger architecture is correct.** §43.16 requires compliance with ALS-specified inspection intervals. Robinson's ALS includes event-based inspection/retirement requirements (blade strike, hard landing, overspeed). The `recordAlsEvent` mutation correctly captures these and enforces the required status transition without requiring the IA to manually update the hours-based tracking.

4. **The separation from `adComplianceRecords` is architecturally correct and compliant.** Mixing ALS items into the AD compliance module would obscure the regulatory basis difference between Part 39 (ADs) and §27.1529 (ICA/ALS). The separate table maintains the distinction in the data layer, which supports accurate compliance reporting in an FSDO audit context.

5. **The Robinson R44 ALS item set identified in §6 (seed data) is materially complete** based on my review of the RFM ALS section and Tobias Ferreira's independent field validation (§2.6). Twenty-one of twenty-three identified ALS items have no corresponding FAA AD.

6. **The LLP dashboard enable gate for Lone Star Rotorcraft (OC-25-01) is now clear.** The Robinson R44 ALS items are enumerated, validated by a Robinson-qualified IA, and implementable in the `alsItems` table. The LLP dashboard may be enabled for Lone Star Rotorcraft's R44 fleet after the seed data is loaded and initial ALS items are created for each aircraft.

**Marcus Webb Compliance Review: ✅ PASS**  
**Part 27.1529 Compliance Attestation: COMPLIANT**  
*2026-02-23*

---

## 9. Final Status Block

### 9.1 OC-25-01 Closure Statement

**Open Condition:** OC-25-01 — Robinson R44 ALS field mapping validation — full ALS component set including main rotor blade retention bolts (ALS item, not AD; RFM §4 ¶4.3). Required before LLP dashboard is enabled for Lone Star Rotorcraft.  
**Filed:** Phase 25 gate review (`reviews/phase-25-gate-review.md`), §3 Open Conditions Table.  
**Severity:** MEDIUM  
**Owner:** Marcus Webb + Tobias Ferreira (Robinson IA, LSR)

**Closure statement:**

OC-25-01 is **closed**. The following actions were completed in WS26-A:

1. Marcus Webb conducted a full Robinson R44 Raven II RFM Section 4 ALS audit (§3 of this document). All ALS items enumerated. FAA AD database cross-referenced for each item. Audit finding: 21 of 23 R44 ALS items have no corresponding FAA AD.

2. Tobias Ferreira (Robinson-qualified CFI / A&P, 12+ years R44 experience) conducted a field interview (§2 of this document). He confirmed the ALS item list, confirmed the ALS-only status of key items including main rotor blade retention bolts, and confirmed the event-based trigger requirements for tail rotor blade (blade strike) and mast assembly (hard landing, overspeed).

3. The `alsItems` data model (§4) was designed, implemented (§5), and validated by Cilla Oduya's 10-test suite (§7). All 10 tests PASS.

4. Robinson R44 seed data (§6) documents 23 ALS items with actual life limits from the RFM.

5. Marcus Webb issued a Part 27.1529 compliance attestation (§8): COMPLIANT.

**Gate cleared:** The LLP dashboard enable gate for Lone Star Rotorcraft's Robinson R44 fleet is **clear**. The `alsItems` feature must be loaded with seed data for each R44 aircraft (N-numbers to be confirmed with Sandra Okafor in WS26-B) before the dashboard is enabled. This is a data entry step, not a gate.

---

### 9.2 PASS/FAIL Judgment

| Item | Judgment |
|---|---|
| OBJ-01 through OBJ-12 (objective checklist) | ✅ 12/12 PASS |
| SME brief — Tobias Ferreira | ✅ COMPLETE |
| Marcus Robinson ALS audit | ✅ COMPLETE |
| `alsItems` schema design | ✅ COMPLETE |
| Convex mutation implementations | ✅ COMPLETE |
| Alert logic | ✅ COMPLETE |
| R44 ALS seed data (23 items) | ✅ COMPLETE |
| Cilla Oduya test suite | ✅ 10/10 PASS |
| Marcus Webb compliance review | ✅ PASS — COMPLIANT |
| OC-25-01 closure | ✅ CLOSED |

**WS26-A Final Verdict: ✅ PASS**

---

### 9.3 Evidence Citations

| Evidence | Location |
|---|---|
| Phase 25 gate review (OC-25-01 origin) | `reviews/phase-25-gate-review.md`, §3, row OC-25-01 |
| Phase 25 gate review (Sandra's finding) | `reviews/phase-25-gate-review.md`, §4, "The Robinson ALS finding" |
| WS25 plan (Part 27 compliance gap background) | `phase-25-v20b/ws25-plan.md`, Part 3 — Fort Worth Helicopter MRO |
| WS26 plan (WS26-A scope and design) | `phase-26-v20c/ws26-plan.md`, WS26-A section |
| SIMULATION-STATE.md (Phase 26 mission, WS26-A status) | `SIMULATION-STATE.md`, Phase 26 workstreams table |
| R44 Raven II RFM Section 4 (ALS) | Robinson Helicopter Company, R44 Raven II Rotorcraft Flight Manual, Section 4 — Airworthiness Limitations (current revision) |
| FAA AD database — Robinson | rgl.faa.gov/adportal (Robinson Helicopter Company / R44 type) |
| 14 CFR §27.1529 | Instructions for Continued Airworthiness — Normal Category Rotorcraft |
| 14 CFR Part 27, Appendix A, §A27.4 | Airworthiness Limitations section requirements |
| 14 CFR §43.16 | Airworthiness Limitations — maintenance compliance requirement |
| 14 CFR §43.7 | Persons authorized to perform maintenance |
| 14 CFR Part 39 | Airworthiness Directives |

---

### 9.4 What This Unlocks

With WS26-A PASS:

- **LLP dashboard for Lone Star Rotorcraft R44 fleet:** AUTHORIZED. Seed data loading is a data entry step; no additional gate required.
- **`alsItems` feature for all helicopter operators:** PRODUCTION-READY. The data model supports R44, R22, and (by schema compatibility) any Part 27 or Part 29 rotorcraft with an ALS section. Future operators (Bell, Sikorsky S-76) require their own ALS seed data — no schema changes needed.
- **WS26-B Lone Star full onboarding:** Compliance surface features enabled for R44 fleet upon seed data load.
- **WS26-D Miles Beaumont dispatch:** Research complete; ALS vs. AD distinction validated; Tobias Ferreira's perspective documented (§2).

---

*WS26-A filed: 2026-02-23T06:00:00Z*  
*OC-25-01: ✅ CLOSED*  
*WS26-A verdict: ✅ PASS*  
*Signatories: Marcus Webb (Compliance Officer), Tobias Ferreira (SME), Cilla Oduya (QA Lead)*  
*Devraj Anand (implementation), Jonas Harker (infrastructure/alert logic)*
