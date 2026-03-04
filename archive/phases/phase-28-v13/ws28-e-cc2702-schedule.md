# WS28-E — CC-27-02 Scheduling: Repetitive AD Interval Tracking Enhancement Decision
**Phase:** 28
**Status:** ✅ COMPLETE — DECISION MADE
**Filed:** 2026-03-18
**Closes:** CC-27-02 (carry-forward from Phase 27 — repetitive AD interval tracking not automatically tracked in current system)

**Owners:**
- Marcus Webb — Compliance Architect (gap definition, risk assessment)
- Devraj Anand — Engineering (effort estimate, implementation approach)

---

## 1. CC-27-02 Summary

**Carry-Forward Condition:** CC-27-02 was created in Phase 27 WS27-C §6.2 (Marcus's note at the end of the DST FSDO readiness review). It was carried forward because the Phase 27 gate closed on the existing FSDO readiness work, but Marcus identified a systemic gap that was not addressed by WS27-C alone.

**The gap in plain language:**

Athelon's `adComplianceRecords` table tracks whether a specific AD applies to an aircraft and what the compliance disposition is. But for ADs with **repetitive inspection intervals** (like AD 2020-07-12's 400-hour repetitive FPI), the current system:
- Records the last compliance date/hours (manually entered)
- Does NOT automatically compute when the next inspection is due
- Does NOT generate an alert when the next repetitive interval is approaching or overdue

The DST-N9944P finding (447 hours overdue) was caused by exactly this gap. The prior DOM recorded the overhaul compliance event in 2022 but never tracked the 400-hour repetitive interval. The system had no mechanism to flag the growing overrun.

**What CC-27-02 asked:** Decide whether to build automatic repetitive AD interval tracking. If yes, when?

---

## 2. Marcus Webb + Devraj Anand — Brief

*Meeting: 2026-03-16. Marcus Webb and Devraj Anand.*

### 2.1 The Current Gap — Marcus

The current `adComplianceRecords` schema captures:
- AD number and applicability determination
- Last compliance action: date, hours, work order link
- Current status: APPLICABLE / COMPLIANT / NOT_APPLICABLE / MARK_FOR_REINSPECTION / NONCOMPLIANT

What it does NOT capture:
- Whether the AD has a **repetitive interval** (versus a one-time compliance action)
- The interval specification (hours, calendar, or both)
- The computed next-due date or hours
- A state machine that automatically transitions from COMPLIANT → approaching → NONCOMPLIANT as hours accumulate

This gap exists because the original `adComplianceRecords` design (Phase 22-era) was focused on one-time AD tracking and status recording, not interval management. The ALS items table (`alsItems`) has this capability because ALS items were designed from the start as interval-managed (Phase 26, WS26-A). AD compliance records were not.

**How serious is this gap?**

For the current customer set:
- Most FAA ADs for piston aircraft (Robinson R44, most Cessna fleet) are either one-time or have intervals managed by the annual inspection cycle. The gap is less severe here.
- Turbine aircraft (Bell 206B-III, S-76C, PT6A-equipped aircraft like DST's fleet) frequently have repetitive ADs with independent hour-based intervals that do NOT align with annual inspection cycles. The gap is materially serious for turbine shops.
- Desert Sky Turbine's N9944P finding is the proof case. The specific AD had a 400-hour interval that is entirely independent of any annual or overhaul schedule.

**Risk of not building this enhancement:**

| Risk Event | Likelihood without Enhancement | Impact |
|---|---|---|
| Another turbine customer misses a repetitive AD interval | Medium (grows as turbine fleet size grows) | Aircraft grounded; potential FSDO enforcement action; liability |
| DST N9944P Engine 2 200-hr re-inspection overrun | Low (Frank is now vigilant; entered manually) | Engine finding progresses; potential airworthiness issue |
| Lone Star Rotorcraft Bell fleet — any repetitive AD | Low (Marcus monitoring manually; smaller fleet) | Same as above |
| S-76C Part 29 repetitive ADs | Medium (Part 29 aircraft frequently have repetitive ADs) | As above; heightened by Part 29 FSDO scrutiny |

The risk grows proportionally with the number of turbine aircraft in our customer orgs. As we onboard more turbine shops, this gap becomes more dangerous.

### 2.2 What the Enhancement Would Do — Devraj

**Schema additions to `adComplianceRecords`:**

```typescript
// Additions to adComplianceRecords schema
{
  // New fields for repetitive AD tracking:
  isRepetitive: v.boolean(),
  // true = this AD has a recurring compliance interval

  repetitiveIntervalHours: v.optional(v.number()),
  // For hour-based intervals: e.g., 400 (AD 2020-07-12)

  repetitiveIntervalDays: v.optional(v.number()),
  // For calendar-based intervals

  lastComplianceHours: v.optional(v.number()),
  // Aircraft hours at last compliance event (already partially captured in notes; now a typed field)

  lastComplianceDate: v.optional(v.string()),
  // ISO date of last compliance event

  nextDueHours: v.optional(v.number()),
  // Computed: lastComplianceHours + repetitiveIntervalHours

  nextDueDate: v.optional(v.string()),
  // Computed: lastComplianceDate + repetitiveIntervalDays

  repetitiveAlertThresholdHours: v.optional(v.number()),
  // Hours before nextDueHours to fire alert. Default: 50 hr (higher than ALS default; AD intervals often longer)

  repetitiveAlertThresholdDays: v.optional(v.number()),
  // Default: 60 days
}
```

**State machine extension:**

Add a `REPETITIVE_APPROACHING` state between COMPLIANT and NONCOMPLIANT for repetitive ADs. On each aircraft hours update (same trigger as `updateAlsCompliance`), check all repetitive AD records and transition:
- COMPLIANT → REPETITIVE_APPROACHING (within alert threshold)
- REPETITIVE_APPROACHING → NONCOMPLIANT (at or past due)

**Alert integration:**

Add `AD_REPETITIVE_APPROACHING` (amber) and `AD_REPETITIVE_NONCOMPLIANT` (red) alert types to the DOM alert infrastructure. Same fire-and-persist pattern as ALS alerts.

**Effort estimate:**

| Task | Est. Days | Complexity |
|---|---|---|
| Schema additions + migration for existing AD records | 1.5 | Low (additive fields; migration backfills `isRepetitive: false` for existing records) |
| updateAdCompliance mutation: repetitive interval logic | 2 | Medium (same pattern as `updateAlsCompliance`) |
| Alert integration: AD_REPETITIVE_APPROACHING + AD_REPETITIVE_NONCOMPLIANT | 1 | Low |
| DOM dashboard: AD repetitive alerts panel | 1.5 | Low (extends existing fleet alert pattern) |
| DOM data entry: mark AD as repetitive + set interval on existing AD records | 1 | Low |
| Test cases (Cilla) | 1.5 | Low |
| **Total** | **~8.5 days** | |

This is a standalone feature sprint of approximately 2 weeks including QA. It could be the primary engineering workstream in a Phase 29 or Phase 30 sprint alongside a smaller parallel feature.

### 2.3 Scheduling Options

| Option | Timing | Rationale |
|---|---|---|
| v1.4 (next version) | ~Phase 29–30, ~8 weeks post v1.3 | Risk is real and growing; turbine fleet is expanding; build it next |
| v2.0 | Phase 31+, ~6 months post v1.3 | Deferred too long given DST proof case |
| Deprioritize (explicit deferral with monitoring) | Indefinite | Risk accepted; Marcus and DOMs track manually; not acceptable for growing turbine customer base |

**Marcus's position:**

> "The N9944P finding was not hypothetical. It cost Desert Sky Turbine money (the FPI bill, the grounding downtime) and it cost Frank Nguyen time and stress he shouldn't have had. If we onboard another turbine shop in Phase 29 — which Nadia is working toward — and that shop has PT6A or Arriel aircraft, they have the same gap from day one. I cannot in good conscience recommend deprioritizing this. The question is v1.4 or v2.0.
>
> I'm recommending v1.4. The effort is ~8.5 days. It closes a gap that has already materialized once. It's not a complex feature. It's a correctness feature."

**Devraj's position:**

> "From an engineering standpoint, this is a straightforward extension of the pattern we've already built for ALS items. The `alsItems` repetitive interval logic is in production and stable. The `adComplianceRecords` extension follows the same pattern. 8.5 days is the right estimate. I'd put it in v1.4 Sprint 1 as the anchor feature."

---

## 3. Decision

**Scheduling decision: Build in v1.4. Priority: Sprint 1 anchor feature.**

**Rationale:**
1. The gap has already caused one real grounding event (N9944P, 447-hour overrun). It will cause more if not addressed.
2. The effort is modest (~8.5 days) and well-understood — same pattern as `alsItems` repetitive interval logic.
3. The customer base is trending toward more turbine aircraft (Phase 28 shop pipeline review, WS28-G). The risk grows with each turbine shop added.
4. Explicit deferral to v2.0 (6+ months) is not acceptable given the known materialized risk.
5. Marcus and Frank are manually monitoring the open intervals as an interim control — this is a human workaround for a system gap. The enhancement replaces the workaround with reliable automation.

**v1.4 feature brief (filed for Phase 29 planning input):**

| Field | Value |
|---|---|
| Feature ID | F-1.4-A |
| Feature name | Repetitive AD Interval Tracking |
| Owner | Devraj Anand (engineering), Marcus Webb (compliance) |
| Effort | ~8.5 days |
| v1.4 placement | Sprint 1 anchor |
| Success criterion | Repetitive AD records compute next-due hours/date; alert fires at threshold; state machine transitions COMPLIANT → APPROACHING → NONCOMPLIANT automatically on aircraft hours update |
| Closes | CC-27-02 |

---

## 4. CC-27-02 Closure Statement

**CC-27-02 — Repetitive AD Interval Tracking Enhancement Decision**

**Opened:** Phase 27 gate review (~2026-02-23). Marcus Webb §6.2 note in WS27-C.
**Context:** Systemic gap — Athelon's `adComplianceRecords` tracks AD applicability and compliance disposition but does not automatically compute or alert on repetitive inspection intervals. DST-N9944P 447-hour overrun was the proof case.

**Decision (2026-03-16):**
- Build repetitive AD interval tracking in **v1.4, Sprint 1** as the anchor feature.
- Feature designated F-1.4-A.
- Effort: ~8.5 days (schema additions, state machine, alert integration, DOM data entry UI, QA).
- Interim control: Marcus Webb and Frank Nguyen manually monitoring all known repetitive AD intervals at DST and Lone Star pending v1.4 ship.
- Deprioritization was considered and rejected. Risk is not theoretical — it has materialized.

**CC-27-02 is CLOSED — decision made.**

*The condition is closed because the question ("build or not, and when?") has been answered. The answer is build in v1.4. The gap remains open in the product until v1.4 ships — that is known and accepted, with interim manual controls in place.*

**Filed: 2026-03-18**
**Marcus Webb: ✅ SIGNED**
**Devraj Anand: ✅ SIGNED**
