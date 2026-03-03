# WS16-I — Multi-Aircraft Task Board Build

**Phase:** 16  
**Depends on:** `phase-15-rd/ws15-h-task-board.md`  
**Owners:** Chloe Park, Finn Calloway, Devraj Anand (realtime backend), Dale Purcell (SME UAT), Danny Osei (SME UAT)  
**Status:** **READY FOR BUILD**

---

## 1) Implementation Spec

Build server-authoritative real-time board projection with deterministic conflict handling and hangar-grade tablet UX.

### Build scope
- Schema/tables: `TaskBoard`, `TaskBoardLane`, `TaskBoardCard`, `TaskBoardEvent`, `TaskBoardConflict`, `TaskBoardPresence`.
- Canonical lane set from WS15-H.
- Event stream with per-card `eventSeq` and optimistic UI reconciliation.
- Conflict banner/rollback UX.
- iPad keyboard-safe + glove-compatible interaction model.

---

## 2) Concrete Mutation / Query / API Contracts

### Query: `getTaskBoardProjection`
```ts
args: { boardId: Id<"taskBoards">; includePresence?: boolean }
returns: {
  board: TaskBoard;
  lanes: TaskBoardLane[];
  cards: TaskBoardCard[];
  watermarkSeq: number;
  presence?: TaskBoardPresence[];
}
```

### Mutation: `moveTaskBoardCard`
```ts
args: {
  boardId: Id<"taskBoards">;
  cardId: Id<"taskBoardCards">;
  fromLaneCode: string;
  toLaneCode: string;
  expectedEventSeq: number;
  reasonCode?: string;
}
throws: TB_SEQ_MISMATCH | TB_POLICY_VIOLATION | TB_AUTH_HOLD | TB_INVALID_TRANSITION
returns: { eventId: Id<"taskBoardEvents">; eventSeq: number; authoritativeLaneCode: string }
```

### Mutation: `updateTaskBoardCardState`
```ts
args: { cardId: Id<"taskBoardCards">; authState?: string; partsState?: string; benchTestState?: string; priorityClass?: string }
returns: { cardId: Id<"taskBoardCards">; eventSeq: number }
```

### Query: `getTaskBoardConflicts`
```ts
args: { boardId: Id<"taskBoards">; sinceTs?: number }
returns: TaskBoardConflict[]
```

---

## 3) UI Behaviors

- Multi-aircraft kanban lanes with tail-number cards.
- AOG cards pinned/high-priority across views with active timer.
- Card face includes blockers (parts/auth/bench/signability).
- Drag-and-drop plus long-press quick actions for glove use.
- Keyboard-open safe layout on iPad (no action occlusion).
- On conflict: rollback optimistic move, show reason, allow retry.
- Authorization hold lane semantics enforced by server (no silent bypass).

---

## 4) UAT Script (Named SMEs: Dale Purcell + Danny Osei)

1. Load active board with 3–5 aircraft in mixed lanes.
2. Dale processes avionics card into `AWAITING_BENCH_TEST` and adds bench note.
3. Danny verifies coordinator view updates in real time without refresh.
4. Trigger authorization hold on one card; attempt forward move; verify server block + explicit reason.
5. Mark one AOG card; verify priority propagation and timer visibility in all views.
6. Run simultaneous move conflict from two sessions; verify deterministic outcome and conflict UX.

**Pass condition:** Dale confirms execution visibility; Danny confirms communication truth and reduced call-chasing.

---

## 5) Cilla Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| I-01 | Happy-path move | event appended, clients updated |
| I-02 | Same-card race | one win, one seq conflict |
| I-03 | Stale seq submit | reject + authoritative state |
| I-04 | Authorization hold bypass attempt | hard reject |
| I-05 | AOG priority propagation | pinned + timer everywhere |
| I-06 | Offline replay stop-on-conflict | replay paused with resolution UI |
| I-07 | Keyboard-open iPad action reachability | no CTA occlusion |
| I-08 | Glove quick-action path | >98% success in test run |
| I-09 | Audit correlation IDs | board event links to WO/task event |
| I-10 | High-card lane virtualization | smooth render under load |

---

## 6) Marcus Compliance Checklist (Where Applicable)

WS16-I is primarily operational UX/realtime coordination, not primary regulatory record creation. Compliance checks limited to traceability and hold enforcement:
- [ ] Authorization-hold policy not bypassable via board transitions.
- [ ] Board events affecting close/signability have correlation IDs into authoritative WO/task audit chain.
- [ ] No board-only state can silently diverge from regulatory record state.

---

## 7) Build Exit + Status

**Build exit criteria:** Cilla matrix green + Dale/Danny UAT pass + hold/correlation compliance checks complete.  
**Status:** **READY FOR BUILD**