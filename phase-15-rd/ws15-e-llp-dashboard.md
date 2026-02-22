# WS15-E — LLP Dashboard + Life Accumulation Engine

**Workstream:** WS15-E  
**Feature:** Life-Limited Part (LLP) Dashboard and Cycle/Hours Life Accumulation Engine  
**Phase:** 15 — R&D + SME-Driven Feature Development  
**Owners:** Devraj Anand (backend), Nadia Solis (PM/product)  
**SMEs:** Erik Holmberg (A&P Powerplant, Wichita KS) + Nate Cordova (Powerplant IA, Phoenix AZ)  
**Date Opened:** 2026-02-22  
**Status:** READY FOR BUILD  

---

## SME Brief

### Erik Holmberg — A&P Mechanic (Powerplant Specialist), TriState Aviation Services, Wichita KS

Erik spent seven years doing teardown-and-rebuild at a dedicated turbine overhaul facility before coming to Part 145. He thinks in components, not work orders. His LLP tracking spreadsheet has 847 rows. He has two USB backups. He knows exactly what this says about the industry.

> "I would very much like to not be the single point of failure for my shop's LLP tracking."

He said this in the first two minutes of the interview, before we asked a question. Then he opened a pocket notebook with four bullet points.

His mental model of the problem:

> "An LLP doesn't care about your work order. A compressor turbine disk doesn't reset at the start of a new work order. It has one life that spans the entire operating history of that engine, regardless of which shop touched it last. So if your software is organized around work orders, you will eventually lose track of a component's real accumulated time. Not because of malice. Because the data model is wrong."

His 2019 incident:

> "PT6A-42. LLP tracking spreadsheet showed 6,240 cycles remaining. I did the math manually against the work orders. Delta of 420 cycles unaccounted for. Previous shop had underreported cycles on a 2014 work order. The disk had 420 more cycles on it than the record showed. I caught it because I did the math myself. I didn't trust the system. Most mechanics trust the system."

His three specific dashboard requirements, from the pocket notebook:

> "One: per engine serial number, every LLP and its current status. Not filtered by work order. By component. Give me one screen that says 'PT6A-42, S/N PCE-123456 — here are your 14 LLPs, here is each one's limit, here is each one's accumulated time, here is each one's remaining time.' One screen. Two: when that engine is inducted into a work order, LLP status should be pre-populated from the component record. I shouldn't have to re-enter the accumulated time. The system should know it and I should be confirming it, not creating it. Three: if I'm about to close a work order and an LLP is within 100 cycles of its limit, flag it. Not block. Flag. Because I might know. But it should make sure I know before the customer flies away."

On monotonic enforcement:

> "The current cycle count should be a running sum that the software computes from every entry, and no new entry should be allowed to make the total go down. Cycles don't go backward. Time doesn't go backward. If you entered 3,200 hours last time and you're trying to enter 3,150 this time, the system should not let you do that. This is not a hard problem. It's a policy decision."

On cross-aircraft component traceability:

> "When you remove a PT6A-42 with serial number PCE-123456 from N447DE and install it in N192AK, the component's accumulated time follows it. The work order on N447DE shows the removal. The work order on N192AK shows the installation. The component record shows both. That's three linked records and all three have to be consistent. Right now our system handles this badly. The component history is a mess of PDF attachments and whoever-remembers-what."

On 8130-3 structured data at receiving:

> "I want them as data, not documents. A scanned 8130-3 is better than nothing. It's maybe 20% of what I need. What I need is the data — part number, serial number, approval basis, who signed it, what shop, what date. Structured fields. Because if I have structured fields, I can query them."

His minimum bar: **the system must be more accurate than the spreadsheet, not less. On day one. Not after six months of tuning.** He will discard the spreadsheet the day we ship something more accurate. He will not discard it for anything less.

---

### Nate Cordova — Powerplant Specialist / IA, Skymark Turbine Services, Phoenix AZ

Nate has nine years of airline heavy MRO on CFM56-7Bs. He has watched Part 145 shops treat cycles as optional for fifteen years. They are not optional.

At our interview, he brought a printed copy of our Phase 2 spec with three sections highlighted. Next to the cycle counter open item, he wrote in the margin: **"This is the question. Answer it before launch."**

His specific incident:

> "1,100 missing cycles on a turbine disk. Not a small error. Eleven hundred cycles. The disk had come through three shops over a 12-year life. Each shop's system treated the cycle count at installation as authoritative — not as something to be verified against the prior record. Shop 2 did a data migration in 2018 and the cycle counter for that disk came over as zero. No one caught it. The disk was approaching the end of its certified life, but the system thought it had hundreds of cycles remaining. I was the fourth shop. I caught it because the accumulated time on the engine didn't add up."

He is not describing this for drama. He is describing a specific class of software failure:

> "Most MRO systems are filing cabinets with a search bar. A filing cabinet stores whatever you put in it. It doesn't tell you when something doesn't add up. The cycle accumulation engine has to be a calculating engine, not a storage engine. It computes the running total from every event. It never takes the entered value as authoritative without verification against the running sum."

His architecture requirement, stated explicitly:

> "Every time a component changes state — installed, removed, cycle count updated — the system re-derives the accumulated life from the chain of events. Not from a stored 'current cycles' field that can be manually edited. From the event chain. The stored field is a cache. The canonical value is the sum of the event chain. If someone tries to enter a new accumulated time that is less than the event chain sum, the system must reject it."

On turbine aircraft cycle counter requirements at aircraft creation:

> "If the aircraft doesn't have a cycle counter when it comes into your system, you cannot track LLP life accurately. And if you cannot track LLP life accurately, you should not be doing turbine maintenance on it. This is not a software preference. This is the regulatory minimum. The absence of cycle data is not a 'we'll add it later' situation. It is a launch blocker."

His test question for the system, asked directly:

> "If I look up serial number PCE-123456 and the system tells me it has 4,800 accumulated cycles, can I see the event log that produces that number? Every installation. Every removal. Every cycle count update. The math that gets me to 4,800? Because if you just show me a number, I have no way to know whether that number is right."

His minimum bar: **cycle counter required at aircraft creation for all turbine aircraft; LLP installation blocked if no cycle counter present; accumulated life derived from event chain (not from a manually edited field); event chain auditable and queryable.**

---

### Failure Modes and Edge Cases (Combined from Both SMEs)

1. **Zero-reset on data migration.** Nate's Skymark incident. A cycle counter imported as zero from a prior system. The system has no way to detect this is wrong. **Mitigation: plausibility guard — if a part's opening balance from 8130-3 Block 12 shows X cycles, and the system's event chain derives Y cycles, and Y < X with no removal events between, flag as suspicious.** Require human confirmation of the discrepancy before the value is accepted.

2. **Underreporting on prior work orders.** Erik's 2019 incident. A work order at a prior shop recorded fewer cycles than actually accumulated. **Mitigation: monotonic enforcement — accumulated hours/cycles can never decrease. Any attempt to enter a cycle count lower than the current running sum throws a hard error, not a warning.**

3. **Cross-aircraft installation gap.** Component removed from Aircraft A and installed in Aircraft B in different work orders, potentially with a gap in time. The component's accumulated life must carry forward through the removal → reinstallation event chain. **Mitigation: component lifecycle is tracked independently of aircraft and work order. The component record accumulates from the event chain regardless of which aircraft it's currently on.**

4. **Opening balance dispute.** An 8130-3 shows an opening balance that the receiving mechanic suspects is wrong. The system must accept the opening balance provisionally (it's a primary source document) but flag the discrepancy if it's inconsistent with known history (e.g., prior system shows different number, or arithmetic doesn't add up). **Mitigation: plausibility check at receiving; manual review workflow for flagged opening balances.**

5. **Shop data entry error — cycles entered as hours (unit confusion).** An operator enters engine hours when the field expects cycles. **Mitigation: field labels explicit (Cycles, not Hours); unit shown in the field; if the entered value is wildly inconsistent with the historical rate (e.g., 50 cycles added when aircraft flew 500 hours — rate of 1:10 instead of expected 1:1 for a turboprop), flag for review.**

6. **Multiple simultaneous LLP installs in one work order.** A complete hot section replacement might install 6–8 LLPs in a single work order. Each must be individually tracked. The UI must support batch installation events without losing individual traceability.

7. **LLP at end of life — missed at induction.** An engine is inducted for an annual inspection. An LLP is at 98% of its certified life. This is not caught at induction because no one looked at the LLP dashboard. The system must surface this proactively at induction. **Mitigation: WO-open alert fires if any LLP on the inducted engine is within configurable threshold (default: 100 cycles / 100 hours) of its limit.**

---

## R&D Scope

### What Needs to Be Designed/Researched Before Build

**Schema design review (Devraj — 1 day):**  
The Phase 4 schema includes `partInstallationHistory` and `cycleCounterRequired` foundations. Devraj must document: (a) the exact current schema; (b) gaps between current schema and the requirements below; (c) migration plan for additive changes.

**Event sourcing architecture decision (Rafael + Devraj — 2 days):**  
Nate's requirement is essentially event sourcing for component life: the accumulated value is derived from the event chain, not stored directly. This is architecturally sound but requires a design decision: do we implement full event sourcing (re-derive accumulated values on every read) or a materialized cache with event-chain verification? 

Options:
- **Full derivation on read:** Always compute from event chain. Guaranteed correctness; potentially expensive for 847-row engine with many events.
- **Materialized cache + event chain audit:** Store `accumulatedCycles` as a derived/cached field, recomputed on every event write. The event chain is the authoritative source; the cache is for display. The cache is verified against the event chain in a scheduled integrity check.

**Recommendation: materialized cache with event chain audit.** The event chain is authoritative; the materialized value is a cache invalidated on every event. A scheduled Convex function runs a nightly reconciliation to verify materialized values match event chain sums. Any discrepancy creates a `llpIntegrityAlert`.

**Proactive alert architecture (Devraj — 1 day design):**  
A scheduled Convex cron function queries all active LLPs, computes remaining life, and creates notifications for: (a) LLP within 100 cycles/hours of limit (configurable); (b) LLP installed on a work order that is about to close. Route alerts to: assigned powerplant technician + QCM + DOM. Define notification schema.

**Opening balance import workflow (Nadia + Devraj — 2 days):**  
Opening balance from 8130-3 Block 12 must be entered at receiving. Nadia to design the receiving workflow UX; Devraj to specify the data model. Question: does the opening balance become the "seed" event in the event chain, or is it a separately tracked field? Answer: it is the seed event — `{ eventType: "opening_balance", source: "8130-3", documentRef: "...", value: N }` — so the event chain computation includes it.

**Regulatory touch points:**
- FAA AC 20-62E — Eligibility, Quality, and Identification of Aeronautical Replacement Parts
- Part 21 Subpart K — Approval of parts
- §43.9 — Maintenance records content (LLP installation/removal is a maintenance event)
- Part 43 Appendix A — Major alterations / engine LLP replacement classification
- ICA (Instructions for Continued Airworthiness) for each specific engine type — this is where the LLP limits come from; the system must reference the ICA, not hard-code limits
- TCDS (Type Certificate Data Sheet) — engine LLP life limits are approved at the TCDS level

---

## Implementation Spec

### Data Model Changes

**New table: `componentLifecycleEvents`** (replaces/extends `partInstallationHistory`)

```typescript
componentLifecycleEvents: defineTable({
  componentId:      v.id("parts"),           // The specific part S/N
  orgId:            v.id("organizations"),
  eventType:        v.union(
    v.literal("opening_balance"),   // initial entry from 8130-3
    v.literal("installed"),         // installed on an aircraft/engine
    v.literal("removed"),           // removed from aircraft/engine
    v.literal("cycle_count_update"),// cycle counter updated during WO
    v.literal("hours_update"),      // hours updated during WO
    v.literal("inspection"),        // inspection event (not install/remove)
    v.literal("life_limit_revised"),// manufacturer issues revised limit
  ),
  eventTimestamp:   v.number(),              // epoch ms — when event occurred
  recordedAt:       v.number(),              // epoch ms — when entered in system
  recordedBy:       v.id("users"),
  workOrderId:      v.optional(v.id("workOrders")),   // null for opening balance
  aircraftId:       v.optional(v.id("aircraft")),
  engineSerialNumber: v.optional(v.string()),          // separate from aircraft S/N
  
  // Life tracking values AT TIME OF EVENT
  cyclesAtEvent:    v.optional(v.number()),   // total accumulated cycles as of this event
  hoursAtEvent:     v.optional(v.number()),   // total accumulated hours as of this event
  cycleDelta:       v.optional(v.number()),   // cycles added by this event (always >= 0 for non-removal)
  hoursDelta:       v.optional(v.number()),   // hours added by this event (always >= 0)

  // Source documentation
  sourceDocType:    v.optional(v.string()),   // "8130-3", "logbook", "AMO-form", etc.
  sourceDocRef:     v.optional(v.string()),   // document number/reference
  notes:            v.optional(v.string()),   // free text, max 1000 chars
})
.index("by_component", ["componentId"])
.index("by_component_timestamp", ["componentId", "eventTimestamp"])
.index("by_workOrder", ["workOrderId"])
.index("by_aircraft", ["aircraftId"])
```

**New table: `llpStatus`** (materialized cache — authoritative values derived from event chain)

```typescript
llpStatus: defineTable({
  componentId:          v.id("parts"),
  orgId:                v.id("organizations"),
  partNumber:           v.string(),
  serialNumber:         v.string(),
  description:          v.string(),
  engineSerialNumber:   v.optional(v.string()),
  currentAircraftId:    v.optional(v.id("aircraft")),  // null if not installed
  
  // Life limits (from ICA/TCDS — must reference the authoritative document)
  cycleLimit:           v.optional(v.number()),
  hourLimit:            v.optional(v.number()),
  lifeLimitSource:      v.string(),   // e.g., "PT6A-42 MM Section 05-10, Rev 47"
  
  // Accumulated life (materialized from event chain — NOT authoritative, re-derived on writes)
  accumulatedCycles:    v.number(),   // running sum of all cycleDelta values
  accumulatedHours:     v.number(),   // running sum of all hourDelta values
  
  // Remaining life (computed from materialized values + limits)
  remainingCycles:      v.optional(v.number()),  // null if no cycle limit
  remainingHours:       v.optional(v.number()),   // null if no hour limit
  
  // Status
  status:               v.union(
    v.literal("active"),       // in service, within limits
    v.literal("near_limit"),   // within alert threshold
    v.literal("at_limit"),     // at or past limit — cannot be installed
    v.literal("removed"),      // not currently installed
    v.literal("scrapped"),     // end of life
  ),
  
  alertThresholdCycles: v.optional(v.number()),  // default 100; org-configurable
  alertThresholdHours:  v.optional(v.number()),  // default 100
  
  lastEventId:          v.id("componentLifecycleEvents"),  // for cache invalidation
  lastComputedAt:       v.number(),  // when this cache was last recomputed
})
.index("by_component", ["componentId"])
.index("by_engine", ["engineSerialNumber"])
.index("by_aircraft", ["currentAircraftId"])
.index("by_status", ["orgId", "status"])
.index("by_org_remaining_cycles", ["orgId", "remainingCycles"])
```

**Modify `aircraft` table:**

Add:
```typescript
isTurbineAircraft:          v.optional(v.boolean()),
cycleCounterRequired:       v.optional(v.boolean()),   // true for all turbine; already in schema, confirm
currentCycleCount:          v.optional(v.number()),    // monotonically enforced
currentCycleCountUpdatedAt: v.optional(v.number()),
currentCycleCountUpdatedBy: v.optional(v.id("users")),
```

**Monotonic enforcement rule:** Any mutation that updates `currentCycleCount` must verify `newValue >= currentValue`. If `newValue < currentValue`, throw `CYCLE_COUNT_MONOTONIC_VIOLATION`. No override path — cycles do not go backward.

**Modify `parts` table (receiving):**

Add structured 8130-3 fields:
```typescript
form8130:  v.optional(v.object({
  certNumber:        v.string(),    // 8130-3 certificate number
  approvalBasis:     v.string(),    // e.g., "FAR 21.305(b)"
  approvingPerson:   v.string(),    // name + cert/approval number
  approvingOrg:      v.string(),    // release authority
  releaseDate:       v.string(),    // ISO date
  openingCycles:     v.optional(v.number()),  // Block 12 total time (cycles)
  openingHours:      v.optional(v.number()),  // Block 12 total time (hours)
  notes:             v.optional(v.string()),
})),
```

### Mutations / Queries / Actions

**Mutation: `addComponentLifecycleEvent`**

```typescript
// Handler enforces:
// 1. If eventType involves cycles/hours: new accumulated value >= prior accumulated value (monotonic)
// 2. If eventType = "installed" and component status = "at_limit": throw LLP_AT_LIFE_LIMIT — blocked
// 3. If aircraft requires cycleCounterRequired and aircraft.currentCycleCount is null: throw CYCLE_COUNTER_REQUIRED
// 4. Writes componentLifecycleEvents record
// 5. Recomputes and writes llpStatus cache (derive from full event chain, not just delta)
// 6. Writes auditLog entry
// 7. If accumulatedCycles > cycleLimit: set llpStatus.status = "at_limit"
// 8. If within alertThreshold: set llpStatus.status = "near_limit"
```

**Mutation: `recordLLPInstallation`**

Specific wrapper for `addComponentLifecycleEvent(eventType: "installed")`.  
Additional enforcement: if `llpStatus.status === "at_limit"` → throw `LLP_AT_LIFE_LIMIT` (hard block, no override).  
If turbine aircraft and no cycle counter: throw `CYCLE_COUNTER_REQUIRED`.

**Mutation: `setLLPOpeningBalance`**

Called at receiving workflow. Takes: `componentId`, `openingCycles`, `openingHours`, `sourceDocRef (8130-3 number)`.  
Creates a `componentLifecycleEvents` record of type `opening_balance`.  
This is the seed event for the component's life chain.  
Includes plausibility check: if the system has any prior events for this serial number (possible duplicate), it flags and requires explicit confirmation.

**Query: `getLLPDashboardForEngine`**

```typescript
// Args: { engineSerialNumber: string }
// Returns: {
//   engineSerialNumber: string,
//   currentAircraftId: Id<"aircraft"> | null,
//   llps: Array<{
//     componentId: Id<"parts">,
//     partNumber: string,
//     serialNumber: string,
//     description: string,
//     cycleLimit: number | null,
//     hourLimit: number | null,
//     accumulatedCycles: number,
//     accumulatedHours: number,
//     remainingCycles: number | null,
//     remainingHours: number | null,
//     status: "active" | "near_limit" | "at_limit" | "removed" | "scrapped",
//     lifeLimitSource: string,
//     percentUsedCycles: number | null,  // for progress bar
//     percentUsedHours: number | null,
//   }>
// }
// Sorted by: percentUsed desc (most critical at top)
```

**Query: `getLLPEventChain`**

Returns complete `componentLifecycleEvents` for a given `componentId`, ordered by `eventTimestamp` asc. Includes running accumulated totals at each event. This is the "show me how you got to 4,800 cycles" view Nate requested.

**Scheduled Function: `llpLifeAlertSweep`** (Convex cron)

Runs: daily at 06:00 UTC.  
For every active `llpStatus` where `status = "near_limit"` or `percentUsedCycles >= 0.80` or `percentUsedHours >= 0.80`:
- Creates a `notifications` record routed to: assigned powerplant technician, QCM, DOM.
- If status changes to `at_limit`: creates `qualityAlerts` record with severity HIGH; blocks further installation.

**Scheduled Function: `llpIntegrityReconciliation`** (Convex cron)

Runs: nightly at 02:00 UTC.  
For every `llpStatus` record:
- Re-derives accumulated values from `componentLifecycleEvents` sum.
- Compares to materialized `accumulatedCycles` / `accumulatedHours`.
- If mismatch detected: creates `llpIntegrityAlert` and routes to Devraj + QCM.
- This is the integrity watchdog that would have caught Nate's 1,100-cycle error.

**Mutation: `closingLLPReview`** (called at WO close)

Before a work order can be marked closed, if the WO includes engine work on a turbine aircraft:  
- Checks: are any LLPs on the inducted engine within alertThreshold of their limit?  
- If yes: surfaced in the WO close flow with explicit acknowledgment required before close.  
- This is Erik's "flag before the customer flies away" requirement.

### UI Components

**Page: `LLPDashboard`** (`/aircraft/[id]/llp-dashboard` or `/engines/[serialNumber]/llp-dashboard`)

Layout: engine serial number header + summary bar (total LLPs, near-limit count, at-limit count) + sortable table of all LLPs.

Table columns: Description | P/N | S/N | Cycle Limit | Acc. Cycles | Remaining | Hours Limit | Acc. Hours | Remaining | Status badge | Last Updated.

Sort default: remaining life ascending (most critical first).

Status badge colors: Green (active), Amber (near_limit), Red (at_limit), Gray (removed/scrapped).

Each row links to: LLP detail page with full event chain.

**Page: `LLPDetail`** (`/parts/[componentId]/lifecycle`)

Top: component identity (P/N, S/N, description, current installation status).  
Life summary: progress bars for cycles and hours with limit markers.  
Event chain: chronological table of all events — event type, date, work order link, aircraft link, cycles/hours at event, delta, recorded by.  
"Show math" toggle: renders the running sum computation at each step.

**Component: `LLPStatusBadge`** — inline badge used throughout WO views to show LLP status at a glance.

**Component: `LLPAlertBanner`** — shown on work order detail page when engine LLPs have near-limit or at-limit status. Non-dismissible if at_limit.

**Component: `LLPConfirmAtClose`** — modal shown during WO close flow if any LLP is within alert threshold. Requires explicit text acknowledgment: "I confirm I have reviewed the LLP status for [engine S/N] and all parts are within approved life limits." Acknowledgment logged as audit event.

### Validation Rules

| Rule | Enforcement Point | Error If Violated |
|---|---|---|
| Cycle count can never decrease (monotonic) | `addComponentLifecycleEvent` + aircraft cycle counter updates | `CYCLE_COUNT_MONOTONIC_VIOLATION` |
| LLP installation blocked if `status = "at_limit"` | `recordLLPInstallation` | `LLP_AT_LIFE_LIMIT` (hard block, no override) |
| Turbine aircraft installation requires cycle counter | `recordLLPInstallation` | `CYCLE_COUNTER_REQUIRED` |
| Opening balance must be present (or exception documented) before part is "available" | Parts receiving flow | Part remains in "pending_traceability" status |
| Plausibility check: opening balance significantly inconsistent with derived history | `setLLPOpeningBalance` | Warning flagged; human confirmation required |
| LLP event chain re-derived at every event write | `addComponentLifecycleEvent` post-write | `llpStatus` materialized cache updated atomically |
| `closingLLPReview` acknowledgment required at WO close for turbine work | WO close mutation | WO cannot close without acknowledgment if LLPs near limit |

---

## Test Plan — Authored by Cilla Oduya

> *"Erik Holmberg has a 847-row spreadsheet and two USB backups because no software has ever been accurate enough to replace it. Nate Cordova caught 1,100 missing cycles in a system everyone else trusted. My job is to write tests that would have caught both of those situations — and then some. If these tests make engineers uncomfortable, that means they're working."*

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| LLP-01 | Happy path: install LLP with valid opening balance, track through two work orders | LLP with opening balance of 1,200 cycles; WO1 adds 80 cycles; WO2 adds 65 cycles | `accumulatedCycles = 1,345`; event chain shows 3 events (opening_balance + 2 updates); remaining cycles = limit minus 1,345; status reflects actual accumulated | FAA ICA requirements; §43.9 |
| LLP-02 | Monotonic enforcement — attempt to enter cycles less than running sum | LLP at 1,345 accumulated cycles; operator enters WO cycle update of 1,200 (below running sum) | Mutation throws `CYCLE_COUNT_MONOTONIC_VIOLATION`; `accumulatedCycles` unchanged at 1,345; audit log records attempted violation with operator identity and entered value; no partial write | Safety-critical monotonic enforcement (Erik + Nate requirement) |
| LLP-03 | LLP at life limit — block installation | LLP with cycleLimit=3,600; accumulatedCycles=3,601; WO attempts to install | `recordLLPInstallation` throws `LLP_AT_LIFE_LIMIT`; no installation event created; no WO progress; user sees: "This LLP has reached its certified life limit. It cannot be installed." No override path | FAA ICA mandatory life limits |
| LLP-04 | Cross-aircraft installation — accumulated life follows component | LLP on Aircraft A (N447DE) at 2,100 accumulated cycles; removed in WO-A; installed in Aircraft B (N192AK) in WO-B 30 days later | LLP event chain shows: opening_balance → [updates on N447DE] → removed (WO-A) → installed (WO-B on N192AK); `accumulatedCycles` at WO-B installation = 2,100 (not reset to 0 or to Aircraft B's cycle count); Aircraft B's LLP dashboard reflects correct accumulated life | §43.9 (traceability across aircraft) |
| LLP-05 | Cycle counter absent — turbine aircraft LLP installation blocked | Aircraft marked `isTurbineAircraft = true`; `currentCycleCount = null`; attempt LLP installation | `recordLLPInstallation` throws `CYCLE_COUNTER_REQUIRED`; no installation event; user sees: "This turbine aircraft requires a cycle counter. Update aircraft record before installing life-limited parts." | Nate Cordova hard launch blocker; Part 43 Appendix A |
| LLP-06 | Nightly integrity reconciliation catches materialized cache mismatch | Inject data anomaly: manually update `llpStatus.accumulatedCycles` without updating event chain (simulating a hypothetical direct-write bypass) | `llpIntegrityReconciliation` cron detects mismatch; creates `llpIntegrityAlert`; routes to QCM + Devraj; `llpStatus` re-derived from event chain (not from manual write); alert includes: component ID, materialized value, derived value, delta | Event sourcing integrity; Nate's 1,100-cycle scenario |
| LLP-07 | Opening balance plausibility check — inconsistent 8130-3 | LLP with prior events in system showing 800 accumulated cycles; incoming 8130-3 shows opening balance of 400 cycles (impossible if part was previously in system) | `setLLPOpeningBalance` flags plausibility issue; requires human confirmation: "The provided opening balance (400 cycles) is inconsistent with existing records (800 cycles derived). Confirm this is correct before proceeding."; if confirmed, creates event with `requiresManualReview = true`; routes to QCM | Erik's 2019 incident prevention |
| LLP-08 | WO close alert — LLP within threshold at close | WO with engine work; one LLP at 3,510 cycles against a 3,600 limit (90 cycles remaining, within 100-cycle threshold) | `closingLLPReview` fires at WO close attempt; modal shown: "[LLP description] — 90 cycles remaining (2.5%)"; operator must type acknowledgment before WO can close; acknowledgment logged as audit event with operator identity and timestamp | Erik's "flag before the customer flies away" requirement |
| LLP-09 | LLP dashboard — correct sort order and completeness | Engine with 14 LLPs at various remaining-life percentages | Dashboard shows all 14 LLPs; sorted by remaining life ascending (most critical first); at_limit badge on any LLP at or past limit; near_limit badge within threshold; all limits, accumulated values, and remaining values correct and consistent with event chain | Erik's "one screen" requirement |
| LLP-10 | Batch installation — 6 LLPs in one work order, independent tracking | Hot section replacement: 6 LLPs installed in single WO, each with different opening balances and limits | Each LLP has its own `componentLifecycleEvents` record; each has its own `llpStatus`; no shared fields; each queryable independently; dashboard shows all 6 with correct individual values | §43.9; individual traceability requirement |
| LLP-11 | Event chain audit ("show me the math") | Engineer accesses LLP detail for component with 4,800 accumulated cycles across 8 events | Event chain displays: each event in chronological order; running total at each event; math column: "prior 4,200 + 600 delta = 4,800"; final value matches `llpStatus.accumulatedCycles`; any event where entered value was questioned (plausibility flag) shown with flag icon | Nate's "I want to see the event log that produces that number" requirement |
| LLP-12 | Proactive alert — 80% life threshold notification | LLP at 80% of cycle limit (e.g., 2,880/3,600 cycles) | `llpLifeAlertSweep` cron creates notification; routes to assigned powerplant technician + QCM + DOM; notification contains: component description, P/N, S/N, engine S/N, current aircraft N-number, % used, cycles remaining; notification appears in system within 24h of sweep | Proactive safety requirement |

---

## Compliance Sign-Off Checklist — Marcus Webb

> *"Nate Cordova wrote 'This is the question. Answer it before launch' in the margin of the spec. I am treating that as a regulatory finding, not a design note. Life-limited parts are defined in 14 CFR Part 21 and governed by Type Certificate Data Sheets for a reason — because their failure modes are catastrophic. The life accumulation engine is not a feature. It is a safety-critical system. I will apply safety-critical review standards."*

| Item | Description | FAR/AC Basis | Hard Blocker |
|---|---|---|---|
| MWC-E-01 | Cycle counter required at aircraft creation for all turbine aircraft; absence blocks LLP installation — hard block, no bypass | Nate Cordova hard launch blocker; Part 43 Appendix A; TCDS requirements | **YES** |
| MWC-E-02 | LLP life limits sourced from ICA/TCDS with document reference captured — limits are never hard-coded in the application | AC 20-62E; ICA compliance | **YES** |
| MWC-E-03 | Accumulated life derived from event chain sum — materialized cache is not the authoritative value; re-derivation runs on every event write | Regulatory accuracy requirement; Nate's event-chain requirement | **YES** |
| MWC-E-04 | LLP installation blocked unconditionally when `status = "at_limit"` — no override path, no supervisor bypass, no exception workflow | FAA ICA mandatory limits; AC 20-62E | **YES** |
| MWC-E-05 | Monotonic enforcement: cycle count and hours cannot decrease — verified at mutation level, not only UI level | Safety-critical monotonic requirement; Erik's incident prevention | **YES** |
| MWC-E-06 | Opening balance from 8130-3 Block 12 captured as structured data, not as a scanned document; structured fields are the primary record | §43.9; Part 21 Subpart K | **YES** |
| MWC-E-07 | Cross-aircraft traceability: accumulated life follows component serial number regardless of aircraft | §43.9; Part 45 marking requirements | **YES** |
| MWC-E-08 | `llpIntegrityReconciliation` cron produces alerts on any materialized-vs-derived mismatch; mismatch requires human resolution before affected LLP is clearable for next installation | Internal integrity control | YES |
| MWC-E-09 | LLP event chain is auditable, non-deletable, append-only — no mutation allows deletion of a `componentLifecycleEvents` record | §91.417 record retention; AC 120-78B append-only principle | **YES** |
| MWC-E-10 | Test cases LLP-01 through LLP-12 all pass with QA sign-off before release | Operational validation | **YES** |
| MWC-E-11 | Erik Holmberg invited to evaluate LLP dashboard against his 847-row spreadsheet for at least 10 components before pilot go-live | Pilot acceptance | YES |
| MWC-E-12 | Part 91 vs Part 121 cycle tracking differences documented — this workstream targets Part 145 repair station use; any Part 121 differences must be scoped separately | Regulatory scoping | No |

---

## Dependency Notes

- Depends on: Phase 14 PASS — **satisfied**
- Depends on: `partInstallationHistory` schema (Phase 4 foundation) — confirm and extend
- Depends on: `cycleCounterRequired` field on aircraft (Phase 3/4) — confirm enforcement point
- Depends on: Parts receiving workflow (WS15 parts scope) — `setLLPOpeningBalance` depends on structured 8130-3 data at receiving
- Enables: WS15-J (qual alerts) uses same notification infrastructure
- Enables: WS15-I (pre-close checklist) includes LLP status in pre-close review

---

## Status

**READY FOR BUILD**

SME input is complete and rich. Schema design is clear. The two pre-build research items (schema gap review, event-sourcing architecture decision) are 3 days total and can be completed in the first days of the sprint.

**Sprint allocation:** 3 weeks  
**Owner for delivery:** Devraj Anand (data model + mutations + cron functions) + Nadia Solis (UX/PM) + Chloe Park (dashboard UI)  
**Marcus checkpoint:** After LLP-03 (life limit hard block) and LLP-05 (cycle counter required) pass in CI; final sign-off after LLP-01..LLP-12 pass.  
**Erik Holmberg acceptance:** Dashboard evaluated against real spreadsheet data (10 components minimum) before pilot go-live.
