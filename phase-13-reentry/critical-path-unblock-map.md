# Phase 13 Re-entry — Critical Path Unblock Map

**As of:** 2026-02-22T17:36Z context scan  
**Decision posture:** Execution can start immediately; current stall is mostly artifact/state hygiene, not technical impossibility.

## 1) Current Critical Path (ordered)

1. **CP1 — Convert WS13-A/B/C from placeholder to executable charters (now).**
   - Required because current WS13 artifacts are `NOT STARTED` + `TBD`, so no receipt-producing work can be judged.
2. **CP2 — Run WS13-A Reliability Closure and WS13-C Scale Certification in parallel, while WS13-B builds immutable index continuously.**
   - Gate requires receipts, KPI deltas, and coherence index in-file (not status headers).
3. **CP3 — Publish WS13-B draft trace map + pointer ledger, then activate WS13-D Integrity Recert Completion.**
   - WS13-D has a real dependency on WS13-B pointer quality.
4. **CP4 — Close WS13-D with I-001..I-005 policy→CI→artifact matrix + blocked-promotion continuity receipt.**
5. **CP5 — Execute WS13-E independent admissibility preflight; only then queue Phase 13 re-entry gate review.**

## 2) Blockers: Real vs Administrative

### Real blockers (evidence-critical)
- **R1:** No decision-grade receipts yet in WS13-A/B/C files (currently placeholders).
- **R2:** WS13-D cannot legitimately PASS until WS13-B trace map/pointers exist and are current.
- **R3:** No independent preflight admissibility output exists yet (WS13-E not run).

### Administrative / state-flag-only blockers
- **A1:** `SIMULATION-STATE.md` marks WS13-A/B/C as “RUNNING,” but workstream files still `NOT STARTED/TBD` (state contradiction).
- **A2:** Gate artifact naming mismatch (`phase-13-reentry-closure/*` active vs requested output under `phase-13-reentry/*`) can cause watchdog/idle mis-detection if path rules are strict.

## 3) Immediate Next 3 Executable Actions (owners)

1. **Action 1 (Owner: Jonas Harker, support: Chloe/Nadia):**
   - Replace all WS13-A/B/C `TBD` sections with explicit checklists, receipt schema, and pass criteria copied from Phase 12 NO-GO scope.
   - **Done when:** each file has concrete output tables + required evidence pointers.

2. **Action 2 (Owners: Chloe/Tanya/Finn + Nadia/Cilla in parallel):**
   - Execute first evidence-producing pass for **WS13-A** (reliability replay matrix + glove-mode trend) and **WS13-C** (PSR/UDS/CAA delta table + excursion mitigations).
   - **Done when:** each has at least one complete run receipt set and interim verdict.

3. **Action 3 (Owners: Devraj + Jonas, then Marcus + Cilla):**
   - Start **WS13-D** immediately after WS13-B publishes draft trace map; then run **WS13-E** preflight on assembled packet.
   - **Done when:** WS13-D matrix complete, WS13-E admissibility checklist signed.

## 4) Estimated Time-to-Next-Gate (first-pass success)

- **Charter/receipt schema fill (CP1):** 2–4 hours
- **First full execution pass WS13-A/B/C (CP2):** 8–12 hours
- **WS13-D completion after B trace map (CP3/CP4):** 4–6 hours
- **WS13-E preflight + packet fixups (CP5):** 2–4 hours

**Total to gate-ready packet:** **~16–26 hours elapsed** (practically **1.5–2.5 working days** with handoffs).

## 5) Anti-idle / Watchdog Trigger Updates Needed

1. **Trigger on content maturity, not file existence:**
   - Mark active only if artifact contains non-TBD checklist items + at least one receipt block.
2. **Contradiction detector:**
   - If state says `RUNNING` but file still `NOT STARTED` for >30 min, auto-flag `STATE_DRIFT` and re-dispatch owner.
3. **Dependency-aware spawn rule:**
   - Allow WS13-D spawn only when WS13-B contains `draft trace map` section with ≥1 CI pointer.
4. **No-idle safeguard:**
   - If `active_workstreams=0` and lock `UNLOCKED`, auto-spawn next eligible WS13 stream and append log line with reason.
5. **Path normalization:**
   - Treat `phase-13-reentry-closure/*` and `phase-13-reentry/*` as the same phase namespace (or enforce one canonical path) to prevent false idle/deadlock.
