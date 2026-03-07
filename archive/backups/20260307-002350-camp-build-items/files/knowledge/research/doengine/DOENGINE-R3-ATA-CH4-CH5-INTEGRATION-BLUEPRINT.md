# DOENGINE R3 — ATA Chapter 4/5 Integration Blueprint (Comprehensive)

Date: 2026-03-06  
Scope: Athelon DoEngine design for ATA-coded AMM Chapter 4/5 due-items  
Primary objective: one simple handling model across broad Ch4/5 item types (calendar, hours, cycles, event), with deterministic recompute and CAMP-like interoperability (without lock-in)

---

## 1) Design Principles (non-negotiable)

1. **Single canonical DO-item contract** for all Ch4/5-driven items.
2. **Deterministic due computation** (same inputs => same outputs, replayable).
3. **Separation of concerns**:
   - Definition (what is required)
   - State (latest counters/events/compliance)
   - Evaluation (pure function)
4. **Auditability first**: every due-state transition explainable by rule + input snapshot.
5. **External compatibility without dependency**: import/export adapters, no internal model coupling to CAMP-specific fields.

---

## 2) Canonical DO-Item Schema (ATA-coded Ch4/5)

## 2.1 Logical entities

- `do_item_definition` (stable requirement intent)
- `do_item_state` (latest operational state)
- `do_item_evaluation` (computed next due + status)
- `do_item_compliance_event` (append-only execution/sign-off history)

## 2.2 Canonical schema (v1)

```json
{
  "doItemId": "DOI-uuid",
  "aircraftId": "AC-uuid",
  "fleetId": "FLEET-uuid",

  "classification": {
    "ataChapter": "05",
    "ataSubchapter": "05-20",
    "ataSystemCode": "05-20-00",
    "sourceChapter": "AMM_CH5",
    "itemType": "TIME_LIMIT | CHECK | INSPECTION | LIFE_LIMIT | AD_RECURRENT | SB_RECURRENT"
  },

  "source": {
    "sourceSystem": "AMM_IMPORT | MANUAL_AUTHOR | CAMP_IMPORT | OTHER",
    "sourceDocumentRef": "AMM Ch5 Sec 20 Task 123",
    "sourceRevision": "Rev 27",
    "manufacturer": "OEM",
    "model": "A/C model",
    "notes": "free text"
  },

  "applicability": {
    "tailNumber": "N123AB",
    "msn": "MSN12345",
    "engines": ["ENG1", "ENG2"],
    "components": ["P/N", "S/N"],
    "effectivityRule": "serialized expression"
  },

  "interval": {
    "basis": "CALENDAR | HOURS | CYCLES | EVENT | MIXED",
    "threshold": {
      "calendar": { "unit": "DAY", "value": 365 },
      "hours": 500,
      "cycles": 300,
      "event": { "code": "LANDING_GEAR_OVERHAUL", "occurrence": 1 }
    },
    "repeat": {
      "calendar": { "unit": "DAY", "value": 365 },
      "hours": 500,
      "cycles": 300,
      "event": { "code": "LANDING_GEAR_OVERHAUL", "occurrence": 1 }
    },
    "window": {
      "earlyBy": { "calendarDays": 30, "hours": 25, "cycles": 20 },
      "lateBy": { "calendarDays": 0, "hours": 0, "cycles": 0 },
      "policy": "STRICT | SOFT_WINDOW"
    },
    "combinationRule": "EARLIEST_WINS | ALL_REQUIRED | PRIMARY_WITH_BACKSTOP"
  },

  "compliance": {
    "method": "PERFORMED | DEFERRED | N/A | SUPERSEDED | ALT_METHOD",
    "lastDoneAt": "2026-02-20T15:05:00Z",
    "lastDoneCounters": { "hours": 4123.7, "cycles": 2874 },
    "lastDoneEventRef": "EVT-uuid",
    "signedOffBy": "USER-uuid",
    "authority": "A&P | IA | CRS | OPERATOR",
    "evidenceBundleId": "EVID-uuid"
  },

  "state": {
    "status": "PLANNED | DUE_SOON | DUE | OVERDUE | BLOCKED | COMPLIED",
    "blockedReason": null,
    "nextDue": {
      "date": "2027-02-20T23:59:59Z",
      "hours": 4623.7,
      "cycles": 3174,
      "eventCode": null
    },
    "dueBasisWinning": "CALENDAR",
    "remaining": {
      "calendarDays": 351,
      "hours": 423.2,
      "cycles": 265
    },
    "computedAt": "2026-03-06T19:00:00Z",
    "engineVersion": "doengine-v1.0.0"
  },

  "governance": {
    "createdAt": "...",
    "updatedAt": "...",
    "createdBy": "...",
    "revision": 6,
    "hash": "sha256(...)"
  }
}
```

## 2.3 Required minimum fields (for acceptance)

- ATA code(s) + source reference
- interval basis + threshold (+ repeat if recurring)
- last done baseline (date and/or counters and/or event)
- next due computed fields
- status + winning basis + evidence reference

---

## 3) Normalization/Mapping Rules (AMM Ch4/5 -> canonical)

## 3.1 Parsing profile

Input may contain:
- AMM Chapter 4 (airworthiness limitations style tasks)
- AMM Chapter 5 (time limits / maintenance checks)
- operator-authored deltas
- imported CAMP-like due entries

Parser outputs a `normalized_draft_item` with confidence score.

## 3.2 Deterministic mapping rules

1. **ATA extraction**
   - If explicit ATA present -> direct map.
   - If only section/task reference present -> map through OEM chapter lookup table.

2. **Interval basis inference**
   - `"months"/"days"/"years"` => `CALENDAR`
   - `"FH"/"hours"` => `HOURS`
   - `"FC"/"cycles"/"landings"` => `CYCLES`
   - trigger text (`"at overhaul"`, `"after replacement"`) => `EVENT`
   - mixed text => `MIXED` with `combinationRule=EARLIEST_WINS` (default)

3. **Threshold/repeat extraction**
   - First-occurrence values -> `threshold`
   - repetitive values -> `repeat`
   - if only one value provided and item marked recurring -> copy threshold to repeat

4. **Applicability/effectivity**
   - tail/model/serial applicability parsed into structured predicates
   - unsupported free text retained in `source.notes` + flag `needsReview=true`

5. **Baseline anchoring**
   - prefer explicit last-compliance event
   - fallback to aircraft induction baseline if allowed by policy
   - otherwise set `status=BLOCKED` with reason `MISSING_BASELINE`

6. **Window policy normalization**
   - explicit tolerance/grace parsed into `window`
   - absent tolerance defaults to strict zero-late policy

7. **Conflict handling**
   - if imported item duplicates existing (same aircraft + sourceRef + ATA + interval signature):
     - merge as new revision (not parallel item)
   - if materially divergent threshold/repeat:
     - preserve both versions, mark prior as superseded pending approval

## 3.3 Mapping confidence model

- `HIGH`: ATA + interval + threshold + baseline all extracted
- `MEDIUM`: baseline missing but inferable
- `LOW`: ATA or interval ambiguous

Low-confidence items cannot go active without operator review.

---

## 4) Deterministic Due-Evaluation Algorithm

## 4.1 Inputs

- canonical `do_item_definition`
- latest aircraft counters snapshot (hours/cycles/date)
- event ledger entries
- latest compliance event for that item
- policy set (strictness, grace, precedence)

## 4.2 Pure evaluation function

`evaluateDue(definition, baseline, currentSnapshot, policy) -> evaluation`

## 4.3 Basis-specific calculations

- **Calendar**: `nextDate = baselineDate + interval`
- **Hours**: `nextHours = baselineHours + intervalHours`
- **Cycles**: `nextCycles = baselineCycles + intervalCycles`
- **Event**: due when event occurrence count reaches threshold
- **Mixed**:
  - compute each basis independently
  - select winning due per `combinationRule` (default earliest breach)

## 4.4 Status resolution order

1. `BLOCKED` if required baseline/counter/event missing
2. `COMPLIED` if completion posted and no recalculation trigger pending
3. `OVERDUE` if any required basis breached beyond allowed window
4. `DUE` if at threshold or within due-now boundary
5. `DUE_SOON` if within early window
6. else `PLANNED`

## 4.5 Pseudocode

```text
function evaluate(item, snapshot, events, policy):
  baseline = resolveBaseline(item, events, policy)
  if baseline.missingRequired:
    return blocked("MISSING_BASELINE")

  dueCandidates = []

  if item.interval has calendar:
    dueCandidates += calcCalendar(baseline.date, interval.calendar)
  if item.interval has hours:
    dueCandidates += calcHours(baseline.hours, interval.hours, snapshot.hours)
  if item.interval has cycles:
    dueCandidates += calcCycles(baseline.cycles, interval.cycles, snapshot.cycles)
  if item.interval has event:
    dueCandidates += calcEvent(baseline.eventCount, interval.event, events)

  winning = chooseCandidate(dueCandidates, item.interval.combinationRule)
  status = classify(winning, snapshot, item.interval.window, policy)

  return {
    nextDue: winning.target,
    dueBasisWinning: winning.basis,
    remaining: winning.remaining,
    status,
    computedAt: now(),
    explain: winning.explain
  }
```

## 4.6 Determinism guarantees

- immutable event ledger
- versioned policy packs
- evaluation hash: `sha256(itemRev + snapshotId + policyVersion + algorithmVersion)`
- replay endpoint must reproduce identical output hash

---

## 5) Minimal Operator UX Flow (must-have)

## 5.1 Flow

1. **Import/Author**
   - ingest AMM/CAMP-like items or author manually
   - show parse confidence + unresolved fields

2. **Due List**
   - unified list by aircraft/month/ATA/status
   - filters: `ATA`, `basis`, `due horizon`, `blocked only`

3. **Monthly Plan**
   - select due items -> generate draft plan
   - group by ATA/package/work scope

4. **WO/Task Execution**
   - create WO tasks from plan items
   - tech executes, adds discrepancies/evidence

5. **Sign-off**
   - compliance event posted with required authority fields
   - evidence bundle linked and locked

6. **Recompute**
   - immediate deterministic recompute
   - delta panel: old due -> new due + why

## 5.2 UX constraints

- no item may move to `COMPLIED` without evidence ref + signer role
- blocked items visible at top (never hidden)
- all status badges explainable with one click

---

## 6) Integration Touchpoints (CAMP-like, no lock-in)

## 6.1 Integration boundaries

1. **Inbound adapters**
   - due list import
   - counters import (airframe/engine/APU)
   - task/compliance import

2. **Outbound adapters**
   - due status export
   - planned package export
   - compliance closure bundle export

3. **Sync control layer**
   - per-tail enablement
   - source-of-truth assignment per datum
   - reconciliation queue for conflicts

## 6.2 Canonical exchange contracts

- `CounterSnapshotExchange` (timestamped cumulative counters)
- `DueItemExchange` (external due references + mapped canonical IDs)
- `ComplianceEventExchange` (performed/signed/evidence metadata)
- `ArtifactManifestExchange` (documents, hashes, URIs)

## 6.3 Anti-lock-in requirements

- internal schema remains canonical; adapters map in/out
- no external key as primary internal ID
- full export available in neutral JSON/CSV + evidence manifest
- adapter logic versioned separately from core due-engine

## 6.4 Reconciliation rules

- decreasing counters rejected unless explicit correction workflow
- identifier mismatch => quarantine queue
- stale external updates ignored by sequence/version checks

---

## 7) Phased Implementation Blueprint

## Phase A — MVP (6–8 weeks)

Deliver:
- canonical schema v1
- AMM/CAMP import mapper v1
- deterministic evaluator for calendar/hours/cycles/event
- minimal UX flow end-to-end
- evidence-linked sign-off + recompute

Exit criteria:
- replay determinism >= 99.99% test pass
- 0 silent status transitions
- 100% due status explainability in UI

## Phase B — Hardening (6 weeks)

Deliver:
- mixed-rule precedence policies (`EARLIEST_WINS`, `ALL_REQUIRED`)
- supersession/alternate method workflow
- reconciliation queue + operator conflict tooling
- integration adapter framework v2
- policy/version governance and audit reports

Exit criteria:
- deterministic hash reproducibility across environments
- integration error triage SLA met
- blocked-item handling validated in ops tests

## Phase C — Parity+ (8–12 weeks)

Deliver:
- advanced monthly planner grouping by ATA package density
- what-if planning scenarios (counter growth assumptions)
- richer third-party exchange templates
- migration toolkit for historical due-items
- role-based compliance dashboards

Exit criteria:
- full migration dry-run for at least one CAMP-like dataset
- parity matrix signed off for targeted Ch4/5 scenarios
- operator adoption metrics meet threshold

---

## 8) Data Model Snapshot (implementation-oriented)

Tables/collections:
- `doItemDefinitions`
- `doItemState`
- `doItemComplianceEvents` (append-only)
- `counterSnapshots`
- `dueEvaluations`
- `integrationMappings`
- `reconciliationQueue`
- `evidenceBundles`

Key indexes:
- by `(aircraftId, status, nextDueDate)`
- by `(aircraftId, ataChapter, ataSubchapter)`
- by `(sourceRef, sourceRevision)`
- by `(externalSystem, externalId)`

---

## 9) Validation Matrix (core scenarios)

1. Calendar-only annual inspection item
2. Hours-only repetitive item
3. Cycles-only landing-triggered item
4. Mixed calendar+hours with earliest-wins
5. Event-driven item (due upon condition)
6. Missing baseline -> blocked
7. Superseded item chain
8. Counter correction conflict
9. Integration identifier mismatch quarantine
10. Post sign-off recompute delta correctness

---

## 10) What this gives Athelon DoEngine

- one simple model for broad ATA Ch4/5 item coverage
- deterministic, explainable due-status engine
- operationally minimal but complete UX loop
- CAMP-like exchange capability while preserving platform independence
- clear path from MVP to hardened parity+
