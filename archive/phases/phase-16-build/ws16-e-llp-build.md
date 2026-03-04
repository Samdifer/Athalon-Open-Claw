# WS16-E — LLP Dashboard Build

**Phase:** 16  
**Depends on:** `phase-15-rd/ws15-e-llp-dashboard.md`  
**Owners:** Devraj Anand, Nadia Solis, Chloe Park, Erik Holmberg (SME UAT), Nate Cordova (SME UAT), Marcus Webb  
**Status:** **READY FOR BUILD**

---

## 1) Implementation Spec

Deliver event-chain-backed LLP tracking with materialized status cache and hard safety gates.

### Build scope
- New table: `componentLifecycleEvents` (append-only chain).
- New table: `llpStatus` (derived cache).
- Enforcement in install/update mutations:
  - monotonic hours/cycles,
  - at-limit install hard block,
  - turbine aircraft cycle-counter required.
- UI:
  - engine LLP dashboard,
  - component lifecycle detail (“show the math”),
  - near-limit alerts in WO close preflight.

---

## 2) Concrete Mutation / Query / API Contracts

### Mutation: `setLLPOpeningBalance`
```ts
args: {
  componentId: Id<"parts">;
  openingCycles?: number;
  openingHours?: number;
  sourceDocRef: string; // 8130-3
}
throws: DUPLICATE_LIFECYCLE_SEED | INVALID_OPENING_BALANCE
returns: { eventId: Id<"componentLifecycleEvents">; statusId: Id<"llpStatus"> }
```

### Mutation: `addComponentLifecycleEvent`
```ts
args: {
  componentId: Id<"parts">;
  eventType: "installed"|"removed"|"cycle_count_update"|"hours_update"|"inspection"|"life_limit_revised";
  workOrderId?: Id<"workOrders">;
  aircraftId?: Id<"aircraft">;
  cycleDelta?: number;
  hoursDelta?: number;
}
throws: CYCLE_COUNT_MONOTONIC_VIOLATION | LLP_AT_LIFE_LIMIT | CYCLE_COUNTER_REQUIRED
returns: { eventId: Id<"componentLifecycleEvents">; recomputed: { accumulatedCycles: number; accumulatedHours: number; status: string } }
```

### Query: `getLLPDashboardForEngine`
```ts
args: { engineSerialNumber: string }
returns: { engineSerialNumber: string; llps: LLPRow[]; nearLimitCount: number; atLimitCount: number }
```

### Query: `getLLPEventChain`
```ts
args: { componentId: Id<"parts"> }
returns: { events: LifecycleEventWithRunningTotals[] }
```

### Scheduled action: `llpIntegrityReconciliation`
```ts
runs nightly
creates llpIntegrityAlert when derived != materialized
```

---

## 3) UI Behaviors

- `/engines/[serial]/llp-dashboard`: all LLPs for engine, sorted by most critical remaining life.
- Status chips: `active`, `near_limit`, `at_limit`, `removed`, `scrapped`.
- “Show Event Chain” opens component detail with running total per event.
- WO close flow shows LLP warning modal if within threshold (default 100 cycles/hours), requiring acknowledgment.
- Any `at_limit` component cannot be installed (hard stop copy displayed in modal).

---

## 4) UAT Script (Named SMEs: Erik Holmberg + Nate Cordova)

1. Seed component from 8130-3 opening balance.
2. Add two work-order cycle updates.
3. Confirm dashboard accumulated values match expected sum.
4. Move component between aircraft; confirm life follows serial number.
5. Attempt decreasing cycle entry; verify hard reject.
6. Attempt install when at/over limit; verify hard reject.
7. Open event-chain detail and verify arithmetic trace to displayed total.

**Pass condition:** Erik confirms spreadsheet parity for sample set; Nate confirms event-chain defensibility and hard gates.

---

## 5) Cilla Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| E-01 | Happy-path accumulation | deterministic totals |
| E-02 | Monotonic violation | reject + no write |
| E-03 | At-limit install | reject |
| E-04 | Turbine without cycle counter | reject |
| E-05 | Cross-aircraft transfer | total preserved |
| E-06 | Event-chain query math | exact running sums |
| E-07 | Reconciliation mismatch injection | llpIntegrityAlert created |
| E-08 | Near-limit close warning | modal + acknowledgment required |
| E-09 | Batch LLP install | independent records |
| E-10 | Dashboard sorting | most critical first |

---

## 6) Marcus Compliance Checklist

- [ ] ICA/TCDS source captured for life limits (no hard-coded limits).
- [ ] Life-limited part install blocked at limit with no override path.
- [ ] Event chain append-only and auditable.
- [ ] 8130-3 key fields structured and queryable.
- [ ] Monotonic enforcement proven at mutation level.

---

## 7) Build Exit + Status

**Build exit criteria:** Cilla matrix green + Erik/Nate UAT sign-off + Marcus checklist complete.  
**Status:** **READY FOR BUILD**