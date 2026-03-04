# WS29 Plan — Phase 29 Workstreams
**Phase:** 29
**Status:** 🟡 PLAN FILED
**Filed:** 2026-04-14
**Owners:** Nadia Solis + Marcus Webb + Devraj Anand + Cilla Oduya + Jonas Harker

---

## Phase 29 Mission

Phase 28 shipped v1.3 — the compliance surface release. N76LS is live in Athelon. Bell, S-76C, FSDO export, SI dashboard, and Repairman cert warning are all in production. The system caught something real: CMR-04-70-003 on N76LS, overdue 112.8 hours, WO open.

Phase 29 is what happens next.

**Four threads:**

1. **Rocky Mountain Turbine Service** (Dale Renfrow, Grand Junction CO) onboards. The shop pipeline identified Dale as the primary Phase 29 candidate. He is a known quantity — Phase 15 SME for IA re-auth, an IA with 22 years of turbine experience, running a 3-person shop with a 208 Caravan and a B200. He wants the system he helped design. We onboard it honestly: scope statement up front, turbine gaps named before Dale asks, Marcus handling compliance surface before Day 1.

2. **Repetitive AD Interval Tracking (F-1.4-A)** builds. CC-27-02 closed with a commitment: v1.4 Sprint 1. The DST N9944P finding made the risk concrete. As the turbine fleet grows, this gap grows. Devraj builds the `repetitiveAdIntervals` extension, Cilla runs regression on the full AD compliance suite, Marcus confirms the regulatory basis. This is the anchor feature of v1.4.

3. **CMR-04-70-003 closes.** WO-LSR-CMR-001 is open. Tobias Ferreira performs the fuel boost pump check on N76LS. Devraj records the closure in the ALS system. This is the first ALS compliance closure at Lone Star Rotorcraft — the first time the system finds something and the shop resolves it through Athelon from open work order to signed closure. Sandra debriefs on what the workflow felt like.

4. **Miles Beaumont files Dispatch No. 11.** Theme: what happens when the system finds something real, and the shop resolves it. The difference between software that reports status and software that changes maintenance behavior.

---

## Phase 29 Workstreams

| Workstream | Status | Artifact Path | Owner(s) |
|---|---|---|---|
| Phase 28 Gate Review | ✅ DONE — GO | reviews/phase-28-gate-review.md | Review Board |
| WS29 Plan | 🟡 FILED | phase-29-v14/ws29-plan.md | Nadia + Marcus + Devraj + Cilla + Jonas |
| WS29-A Rocky Mountain Turbine Service Onboarding (Dale Renfrow, DOM) | ⬜ PLANNED | phase-29-v14/ws29-a-rmts-onboarding.md | Nadia + Marcus + Dale Renfrow |
| WS29-B Repetitive AD Interval Tracking — F-1.4-A Build (CC-27-02 / v1.4 Sprint 1) | ⬜ PLANNED | phase-29-v14/ws29-b-f14a-repetitive-ad.md | Devraj + Marcus + Cilla |
| WS29-C N76LS CMR-04-70-003 Resolution (WO-LSR-CMR-001 Closure) | ⬜ PLANNED | phase-29-v14/ws29-c-n76ls-cmr-closure.md | Tobias Ferreira + Devraj + Sandra Okafor |
| WS29-D Miles Beaumont — Eleventh Dispatch | ⬜ PLANNED | phase-29-v14/dispatches/dispatch-29.md | Miles Beaumont |

---

## Workstream Briefs

---

### WS29-A — Rocky Mountain Turbine Service Onboarding (Dale Renfrow, DOM)

**Status:** ⬜ PLANNED
**Artifact:** `phase-29-v14/ws29-a-rmts-onboarding.md`
**Owners:** Nadia Solis (onboarding lead), Marcus Webb (compliance), Dale Renfrow (DOM / primary customer contact)

**Background:**

Dale Renfrow was identified in WS28-G as the primary Phase 29 onboarding candidate (fit score 8.5/10 — highest in the pipeline). He is the IA running Rocky Mountain Turbine Service in Grand Junction, CO (KGJT). His shop is a 3-person operation: Dale + 2 A&P mechanics. Fleet served: Cessna 208 Caravan (PT6A engines), Beechcraft B200 King Air.

Dale is a known quantity — Marcus worked with him on WS15-B (IA re-auth design). He understands the product from the inside. He inquired because he wants to solve the problem he helped design the system to solve: mechanics who can work without him in the room.

**Pre-Onboarding Call (Nadia-led, Marcus present):**

Before Day 1, Nadia and Marcus conduct a pre-onboarding scoping call with Dale. Agenda:

1. **Scope statement:** Rocky Mountain Turbine operates under Part 91 only (not Part 145). Athelon supports Part 91 work. No Part 135 scope in this onboarding. Confirm Dale has no immediate Part 135 needs.

2. **Compliance surface — what's ready:**
   - B200 King Air: ALS tracking is supported (DST precedent; PT6A-powered aircraft). AD compliance surface ready. LLP dashboard for PT6A (same engine family as DST's fleet).
   - 208 Caravan: Part 91 work. ALS for the 208 Caravan (PT6A-114A) will require a short ALS audit (estimate: 3–4 days Marcus). NOT ready on Day 1 — this is a known gap to be named upfront.

3. **Compliance surface — what's not yet ready (Marcus names it honestly before Dale asks):**
   - 208 Caravan ALS template: not yet in the system. A Caravan ALS audit is needed before the ALS board can be used for the 208. Marcus will scope the audit during onboarding. This does not block Day 1 work orders.
   - Repetitive AD interval tracking (F-1.4-A): building in v1.4. Until it ships, Dale will need to manually track repetitive AD intervals. Marcus will give Dale a specific list of PT6A repetitive ADs that apply to his fleet and the tracking mechanism to use in the interim.
   - Part 135 scope: not in current onboarding. Rocky Mountain's Part 91 posture means this is not immediately blocking, but if Dale takes on any Part 135 work, the Part 135 compliance surface is available (Phase 25 built it — Priya's shop uses it).

4. **What Day 1 looks like:** Aircraft roster entry, first work order, scope confirmation.

**Day 1 — Aircraft Roster and First Work Order:**

- Dale enters his aircraft roster: Cessna 208 Caravan(s) and B200(s) with tail numbers, total times, engine serial numbers.
- B200 ALS board activated (Marcus confirms templates are correct for Dale's specific B200 variant).
- First work order opened — a real, current maintenance task in Dale's queue.
- Scope confirmation: after first WO, Dale signs a one-paragraph scope statement confirming: Part 91 work, aircraft roster current, compliance surface limitations understood.

**Turbine-Specific Regulatory Gaps (Marcus names before Dale asks):**

Marcus is required to surface the following at the pre-onboarding call, before Dale asks:

1. **208 Caravan ALS:** Not in Athelon yet. Timeline for audit and template population: 3–4 days Marcus; target within first 2 weeks of Phase 29. Dale should not rely on the Caravan ALS board until the audit is complete.

2. **Repetitive AD intervals:** The system does not yet automatically track repetitive AD inspection intervals (this is F-1.4-A, building in Phase 29). For Dale's PT6A fleet, the key repetitive ADs are similar to the ones DST has (compressor turbine rotor FPI, etc.). Marcus will provide a reference list and the manual tracking protocol until F-1.4-A ships.

3. **LLP dashboard — Caravan:** PT6A-114A (208 Caravan engine) has life-limited components. The LLP dashboard supports PT6A family generally (DST B200 precedent). Marcus will confirm the specific Caravan powerplant LLP items are correctly loaded before the Caravan ALS audit completes.

**Success criteria for WS29-A:**

- [ ] Pre-onboarding call complete — scope statement agreed, compliance gaps named
- [ ] Dale's aircraft roster entered
- [ ] First work order opened and completed
- [ ] Scope statement signed by Dale
- [ ] Marcus 208 Caravan ALS audit scoped and timeline confirmed
- [ ] Repetitive AD interim tracking protocol delivered to Dale

---

### WS29-B — Repetitive AD Interval Tracking — F-1.4-A Build

**Status:** ⬜ PLANNED
**Artifact:** `phase-29-v14/ws29-b-f14a-repetitive-ad.md`
**Owners:** Devraj Anand (engineering), Marcus Webb (compliance), Cilla Oduya (QA)
**Feature ID:** F-1.4-A
**Closes:** CC-27-02 (product gap; CC closed by scheduling decision in Phase 28; feature closure by ship)
**v1.4 placement:** Sprint 1 anchor feature

**Background:**

The gap was documented in WS28-E: `adComplianceRecords` tracks AD applicability and compliance disposition but does not automatically compute or alert on repetitive inspection intervals. The N9944P 447-hour overrun on AD 2020-07-12 was the materialized proof case. Marcus and Devraj committed to v1.4 Sprint 1 in WS28-E. Effort estimated at ~8.5 days.

**Engineering scope (Devraj):**

Schema additions to `adComplianceRecords`:

```typescript
// New fields for repetitive AD interval tracking
isRepetitive: v.boolean(),
repetitiveIntervalHours: v.optional(v.number()),
repetitiveIntervalDays: v.optional(v.number()),
lastComplianceHours: v.optional(v.number()),
lastComplianceDate: v.optional(v.string()),
nextDueHours: v.optional(v.number()),        // computed
nextDueDate: v.optional(v.string()),          // computed
repetitiveAlertThresholdHours: v.optional(v.number()),  // default: 50 hr
repetitiveAlertThresholdDays: v.optional(v.number()),   // default: 60 days
```

State machine extension: add `REPETITIVE_APPROACHING` state between COMPLIANT and NONCOMPLIANT. On aircraft hours update, check all repetitive AD records and transition:
- COMPLIANT → REPETITIVE_APPROACHING (within threshold)
- REPETITIVE_APPROACHING → NONCOMPLIANT (at or past due)

Alert types: `AD_REPETITIVE_APPROACHING` (amber) and `AD_REPETITIVE_NONCOMPLIANT` (red).

**UI scope:**

- DOM data entry: per-AD toggle to mark repetitive + interval specification
- Per-AD compliance history with interval visualization (last complied → next due → trend)
- Fleet-level repetitive AD approaching/overdue panel on DOM dashboard

**QA scope (Cilla):**

- Regression on existing AD compliance suite (PASS all existing TC before new test cases run)
- New test cases: repetitive interval computation, APPROACHING state transition, NONCOMPLIANT transition, alert fire, DOM data entry UI
- Regression coverage: DST N9944P scenario (447-hour overrun scenario must be detected and alerted)

**Compliance confirmation (Marcus):**

Marcus confirms regulatory basis: the system's obligation is to faithfully represent the AD's compliance requirements, not to substitute for the operator's AD compliance program. The APPROACHING and NONCOMPLIANT states are advisory displays based on data the DOM enters — they inform the DOM but do not replace the DOM's independent AD compliance determination.

Marcus reviews the UI language to ensure the display is clear: "Based on entered compliance data, this AD's next inspection is due at X hours / by Y date." No language that implies Athelon is the compliance authority.

**Success criteria for WS29-B:**

- [ ] Schema additions implemented and migration run (existing records backfilled: `isRepetitive: false`)
- [ ] `updateAdCompliance` mutation handles repetitive interval logic
- [ ] Alert types AD_REPETITIVE_APPROACHING + AD_REPETITIVE_NONCOMPLIANT firing correctly
- [ ] DOM dashboard AD repetitive panel visible
- [ ] Per-AD interval visualization UI shipped
- [ ] Cilla regression on existing AD suite: PASS
- [ ] Cilla new interval tracking test cases: PASS
- [ ] Marcus compliance review: regulatory basis confirmed, UI language approved
- [ ] DST N9944P scenario test case: PASS (447-hr overrun correctly detected in simulation)

---

### WS29-C — N76LS CMR-04-70-003 Resolution (WO-LSR-CMR-001 Closure)

**Status:** ⬜ PLANNED
**Artifact:** `phase-29-v14/ws29-c-n76ls-cmr-closure.md`
**Owners:** Tobias Ferreira (A&P, Lone Star Rotorcraft — performs the work), Devraj Anand (records closure in ALS system), Sandra Okafor (DOM — debrief)
**Resolves:** OI-29-01 — N76LS CMR-04-70-003 OVERDUE; WO-LSR-CMR-001 open from Phase 28 (WS28-F §4.4)

**Background:**

The N76LS ALS data entry session (WS28-F, 2026-04-11) surfaced CMR-04-70-003: the Fuel Boost Pump — Primary Circuit Functional Check, a 300-hour Certification Maintenance Requirement. The item was 112.8 hours past due at data entry. WO-LSR-CMR-001 was opened immediately. Marcus issued a compliance advisory for N76LS.

This is the first finding the ALS system caught and resolved at Lone Star Rotorcraft. It is a milestone: the system found something real, the shop responds, the closure is recorded in Athelon end-to-end.

**Resolution sequence:**

1. **Tobias Ferreira performs the work:**
   - Fuel boost pump primary circuit functional check per Sikorsky S-76C ICA (Chapter 04-70 / CMR-04-70-003 procedure reference)
   - Work performed at Lone Star Rotorcraft, Fort Worth TX
   - WO-LSR-CMR-001 signed by Tobias Ferreira (A&P Powerplant) upon completion
   - RTS signed by Sandra Okafor (DOM) upon WO closure

2. **Devraj records the closure in Athelon:**
   - Tobias (or Sandra) opens WO-LSR-CMR-001 in Athelon and closes it with:
     - Completion date
     - Aircraft hours at completion
     - Signed by: Tobias Ferreira (A&P cert number)
     - RTS signed by: Sandra Okafor (DOM)
   - The ALS system transitions CMR-04-70-003 from OVERDUE → COMPLIANT
   - Next due hours/date computed: current TT + 300 hr
   - DOM alert `CMR_OVERDUE` dismisses on closure
   - New `CMR_APPROACHING` alert will fire when N76LS approaches the next 300-hr interval

3. **Sandra Okafor debrief — DOM workflow perspective:**

Sandra debriefs on what the ALS compliance closure workflow felt like from the DOM's seat. Specific questions:

   - How did it feel to go from "CMR was found by the system" to "WO opened, work done, WO closed, compliance board updated"? Was the workflow clear? Any friction?
   - Does the ALS board accurately reflect N76LS's updated compliance state after closure?
   - Would Sandra have found CMR-04-70-003 on her own without the data entry session? (Answer already known: no — Marcus named this at the session. But Sandra's reflection matters.)
   - What does it mean to her that the next 300-hour interval is now automatically tracked?

Sandra's debrief is recorded verbatim in the WS29-C artifact. It will feed Dispatch No. 11.

**What this closure represents:**

The ALS compliance closure workflow is:
- Compliance item enters OVERDUE state → DOM alert fires
- Work order opened → item linked to WO
- Work performed → WO signed by A&P
- WO closed → DOM RTS sign-off
- ALS item transitions to COMPLIANT → next interval computed → DOM alert resets

This is the full loop. Phase 26-28 built the tracking layer. Phase 29 WS29-C is the first time the loop runs to completion on a real finding.

**Success criteria for WS29-C:**

- [ ] Tobias Ferreira performs CMR-04-70-003 check; WO-LSR-CMR-001 signed
- [ ] Sandra Okafor signs RTS on WO-LSR-CMR-001
- [ ] WO closed in Athelon; CMR-04-70-003 transitions OVERDUE → COMPLIANT
- [ ] Next 300-hour interval computed and active in ALS board
- [ ] CMR_OVERDUE DOM alert cleared
- [ ] Sandra debrief completed and recorded
- [ ] Marcus confirms closure is compliant (ALS item resolution logged per Part 29 ICA requirements)

---

### WS29-D — Miles Beaumont Eleventh Dispatch

**Status:** ⬜ PLANNED
**Artifact:** `phase-29-v14/dispatches/dispatch-29.md`
**Owner:** Miles Beaumont, embedded correspondent

**Theme:**

*What happens when the system finds something real — and the shop resolves it.*

The Tenth Dispatch (WS28-H) ended with Sandra's text to Nadia: "The system caught it before I did — that's exactly what I wanted when I started this." The Eleventh Dispatch is the follow-through: the system caught CMR-04-70-003. Tobias fixed it. Sandra closed the work order. The compliance board updated. The next interval is now tracked.

**Secondary theme:**

*The difference between software that reports status and software that changes maintenance behavior.*

Most MRO software reports. It shows a list. It doesn't change what happens in the hangar. The ALS closure workflow is different: the OVERDUE state created urgency. The DOM alert ensured Sandra knew. The work order linkage ensured the fix was tied to documentation. The COMPLIANT transition after closure means the next interval starts from a known baseline. The software did not just report the problem — it changed the sequence of events in the hangar.

**Rocky Mountain Turbine Service:**

The Eleventh Dispatch also introduces Dale Renfrow and Rocky Mountain Turbine Service. The product is now reaching turbine operators — not large shops, not offshore heavy MRO, but the IA at a 3-person shop in Grand Junction who helped design the IA re-auth workflow and now wants to use what he built. The pipeline is extending naturally from the core product's reputation.

**Structural notes:**

- The dispatch should not oversell. It should be honest about what the system did (caught a known gap through a data entry process) and what it didn't do (there was no automated detection before data was entered — the system caught it because Sandra and Marcus sat down and entered the data correctly).
- The repeatability question: N76LS had one OVERDUE CMR. What does the ALS closure change? It changes that the NEXT overdue event on N76LS will be anticipated, not discovered. The system now knows when the next check is due.
- Dale's line, from his WS15-B days: "mechanics who can work without me in the room." The Eleventh Dispatch should note the connection: the product that Dale helped design to solve his problem is about to be in his shop.

**Success criteria for WS29-D:**

- [ ] Dispatch No. 11 filed
- [ ] CMR-04-70-003 closure narrative complete
- [ ] "Software that changes behavior vs. reports status" theme clearly expressed
- [ ] Rocky Mountain Turbine Service introduction included
- [ ] Honest about what automated detection required (data entry first)

---

## Phase 29 Dependencies and Sequencing

```
Phase 28 Gate Review (DONE)
         │
         ├── WS29-C (N76LS CMR closure — no tech dependency; field work first)
         │     └─ Tobias performs work → Sandra signs RTS → Devraj closes in system
         │
         ├── WS29-A (Rocky Mountain onboarding — depends on Dale accepting proposal)
         │     └─ Pre-onboarding call → Day 1 → scope confirmation
         │
         ├── WS29-B (F-1.4-A build — engineering sprint; parallel with A and C)
         │     └─ Devraj schema + state machine → Cilla test suite → Marcus compliance review
         │
         └── WS29-D (Dispatch — depends on WS29-A and WS29-C narrative material)
```

**No hard blocking dependencies between WS29-A, WS29-B, WS29-C.** All three can begin in Phase 29. WS29-D waits for WS29-A and WS29-C narrative to be complete.

---

## Phase 29 Open Items Inherited from Phase 28

| # | Item | Source | Status |
|---|---|---|---|
| OI-29-01 | N76LS CMR-04-70-003 OVERDUE — WO-LSR-CMR-001 open | WS28-F | WS29-C resolves |
| OI-29-02 | N76LS DUE_SOON items (3 components) | WS28-F | Maintenance planning — Sandra + Tobias to schedule |
| OI-29-03 | Engine 2 (PCE-54210) 200-hr AD re-inspection flag | WS28-D | Marcus + Frank monitoring; F-1.4-A automates when shipped |
| OI-29-04 | F-1.4-A gap open until v1.4 ships | WS28-E | WS29-B closes |

---

## Phase 29 Exit Criteria

- [ ] Phase 28 Gate Review: ✅ GO (filed)
- [ ] WS29-A complete: Dale Renfrow onboarded, scope confirmed, first WO open
- [ ] WS29-B complete: F-1.4-A built, Cilla regression PASS, Marcus compliance confirmed
- [ ] WS29-C complete: WO-LSR-CMR-001 closed, CMR-04-70-003 COMPLIANT in Athelon
- [ ] WS29-D complete: Eleventh Dispatch filed
- [ ] Phase 29 Gate Review filed and GO verdict recorded

---

## Nadia Sign-Off

Rocky Mountain Turbine is the right first call for Phase 29. Dale's proposal has been sent. The onboarding is clean: Part 91 only, known fleet, known person. The compliance gaps (Caravan ALS, repetitive AD tracking) will be named before Dale asks. That's how we do this.

F-1.4-A is the right engineering priority. CC-27-02 materialized. The repetitive interval tracking gap is real. Building it in v1.4 Sprint 1 is what Marcus asked for and what the evidence demands.

CMR-04-70-003 closing in Phase 29 is the first full ALS loop at Lone Star. That matters — not because of the specific check, but because it demonstrates the whole workflow from detection to resolution inside the system.

**Nadia Solis — WS29 Plan Sign-Off: ✅ FILED**
*Phase 29 is ready to execute.*
*2026-04-14*
