# WS32 Plan — Phase 32 Execution Plan
**Phase:** 32
**Version arc:** v1.4 (closes)
**Timeline:** 2026-06-16 through 2026-07-15
**Status:** ✅ DONE

---

## §1. Mission Statement

Phase 32 closes the v1.4 development arc with a full production release of v1.4.0 to all seven shops. It is simultaneously a shipping event and a compliance event: the ALS lifecycle machinery built across Phases 29–31 becomes the permanent operational standard for every shop on the platform. Two open items from Phase 31 carry the highest urgency — the N88KV fuel selector valve physical status (OI-32-01) and the N4421T TBM 850 ALS full audit (OI-32-02) — and both must be resolved before the gate closes. The 30-day RMTS check-in (OI-32-03) and shop pipeline review run in parallel. Phase 32 ends with a v1.5 scoping session that sets the program's direction for the next development arc.

---

## §2. Team Roster

| Name | Role | Phase 32 Responsibilities |
|---|---|---|
| **Nadia Solis** | Program Director | Overall phase ownership; RMTS check-in lead (WS32-C); shop pipeline decision (WS32-D); v1.5 session facilitator (WS32-E) |
| **Marcus Webb** | Director of Compliance | Compliance final review — all regulatory-touching features (WS32-A); N88KV physical inspection determination + N4421T ALS audit lead (WS32-B) |
| **Devraj Anand** | Engineering Lead | Integration test support; migration tooling; deployment infrastructure (WS32-A); data integrity validation across all shops |
| **Cilla Oduya** | QA / Test Lead | Full regression suite across F-1.4-A through F-1.4-F (WS32-A); TC matrix authorship; integration test sign-off |
| **Jonas Harker** | Release / Infrastructure Lead | Release gate (WS32-A); deployment checklist; all-shops rollout execution; migration steps for existing data |
| **Miles Beaumont** | Embedded Journalist | Fourteenth dispatch (WS32-F) |
| **Curtis Pallant** | DOM, Ridgeline Air Maintenance | Coordinates WS32-B on-site actions; WO-RDG-002 authorization |
| **Dale Renfrow** | DOM, RMTS | WS32-C check-in counterpart; UAT smoke test confirmation (WS32-A) |
| **Sandra Okafor** | DOM, Lone Star Rotorcraft | UAT smoke test confirmation (WS32-A) |

---

## §3. Workstream Inventory

| WS ID | Name | Owner(s) | Target Complete | Priority |
|---|---|---|---|---|
| WS32 Plan | Phase 32 Execution Plan | Nadia + Marcus + Devraj + Cilla + Jonas | 2026-06-16 | Anchor |
| WS32-A | v1.4.0 Integration Testing + Release | Cilla + Marcus + Jonas + Devraj | 2026-06-20 | **CRITICAL PATH** |
| WS32-B | Ridgeline Air Maintenance Follow-Up | Marcus + Curtis Pallant + Nadia | 2026-06-17 to 2026-06-23 | **HIGHEST COMPLIANCE URGENCY** |
| WS32-C | RMTS 30-Day Operational Check-In | Nadia + Marcus + Dale Renfrow | 2026-06-20 | High |
| WS32-D | Shop Pipeline Review | Nadia Solis | 2026-06-25 | Medium |
| WS32-E | v1.5 Scoping Session | Nadia + Marcus + Devraj + Cilla + Jonas | 2026-07-01 | Medium |
| WS32-F | Miles Beaumont — Fourteenth Dispatch | Miles Beaumont | 2026-07-10 | High |

---

## §4. Critical Path and Dependency Map

```
2026-06-16: WS32 Plan → anchor point, Phase 32 officially open
2026-06-17: WS32-B opens (OI-32-01 physical inspection — independent of v1.4.0)
2026-06-18: WS32-A integration test suite begins (Cilla leads)
2026-06-20: v1.4.0 release target (Jonas release gate); WS32-C RMTS check-in call (Dale)
2026-06-23: WS32-B closes (N88KV inspection + N4421T ALS audit both resolved)
2026-06-25: WS32-D shop pipeline review complete
2026-07-01: WS32-E v1.5 scoping session
2026-07-10: WS32-F dispatch filed
2026-07-15: Phase 32 gate review → GO
```

**Critical dependency:** WS32-A (release) is independent of WS32-B (compliance). Both can run in parallel from day 1. WS32-C is dated to coincide with the release so Dale Renfrow receives v1.4.0 as part of the check-in context.

**WS32-B internal sequence:**
1. Marcus Webb compliance determination (2026-06-17): physical inspection warranted
2. WO-RDG-002 opened (N88KV fuel selector valve physical status)
3. Inspection performed at Ridgeline (2026-06-18 or 2026-06-19)
4. Findings documented → WO closed → ALS board confirmed
5. OI-32-01 and OI-32-02 both resolved before 2026-06-24

---

## §5. Simulation Dates

| Event | Sim Date |
|---|---|
| Phase 32 kickoff | 2026-06-16 |
| Marcus compliance determination — N88KV | 2026-06-17 |
| WO-RDG-002 opened | 2026-06-17 |
| N88KV physical inspection | 2026-06-18 |
| WS32-A integration test run begins | 2026-06-18 |
| RMTS 30-day check-in call (Dale Renfrow) | 2026-06-20 |
| v1.4.0 release — all shops | 2026-06-20 |
| N4421T TBM 850 ALS audit | 2026-06-19 to 2026-06-23 |
| WO-RDG-002 closed | 2026-06-20 |
| WS32-D shop pipeline review | 2026-06-25 |
| WS32-E v1.5 scoping session | 2026-07-01 |
| WS32-F dispatch filed | 2026-07-10 |
| Phase 32 gate review | 2026-07-15 |

---

## §6. Risk Register

| Risk ID | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-32-01 | N88KV physical inspection reveals valve condition requiring grounding or expedited replacement | Medium | High (compliance / ops) | Marcus pre-briefed; WO-RDG-002 structured to handle any outcome; Curtis has supplier contact from WO-RMTS-003 precedent |
| R-32-02 | N4421T TBM 850 ALS audit uncovers an unexpected time-expired component | Low | High (OI escalation) | Marcus leads audit; immediate ALS board lock if time-expired item found; escalation to owner per 14 CFR §91.409 |
| R-32-03 | Integration test reveals a regression in an F-1.4 feature requiring patch before release | Medium | Medium (release delay 1–3 days) | Cilla's TC matrix has been built incrementally across Sprints 1–3; known surface area; Jonas has a patch pipeline ready |
| R-32-04 | Dale Renfrow identifies a critical product gap at the 30-day check-in that affects v1.4.0 launch decision | Low | Medium | Nadia + Marcus review any gap before release goes out; minor issues logged as v1.5 candidates; release not delayed unless safety-critical |
| R-32-05 | v1.5 scoping session produces an overly ambitious backlog that can't be realistically resourced | Medium | Low (planning risk only) | Devraj's effort ratings gate the final backlog; Nadia's facilitation enforces scope discipline |

---

## §7. Success Criteria

**WS32-A (Release):**
- v1.4.0 deployed to all 7 shops on 2026-06-20
- Cilla TC matrix: all features PASS with no open P1/P2 defects
- Marcus compliance final sign-off on record
- UAT confirmation from at least 2 DOM contacts
- Jonas release gate checklist completed with all items checked

**WS32-B (Ridgeline Follow-Up):**
- OI-32-01 resolved: N88KV fuel selector valve physically inspected, finding documented, WO-RDG-002 closed
- OI-32-02 resolved: N4421T TBM 850 full ALS audit completed, all items entered, any immediate findings documented
- ALS board for both aircraft confirmed accurate post-audit

**WS32-C (RMTS Check-In):**
- Check-in call conducted on 2026-06-20
- Dale's candid feedback documented
- Any product gaps or feature requests logged for v1.5 scoping

**WS32-D (Pipeline):**
- Shop roster reviewed
- 1–2 prospect profiles created
- Nadia's consolidation vs. 8th shop recommendation filed with rationale

**WS32-E (v1.5 Scoping):**
- v1.5 feature backlog (top 5–7 candidates) with priority/effort ratings
- v1.5 theme statement approved by Nadia

**WS32-F (Dispatch):**
- Miles Beaumont fourteenth dispatch filed
- 750–1100 words, v1.4.0 release as theme, Miles's voice

---

## §8. Phase 32 Exit Gate Criteria

1. All Phase 32 workstream rows marked ✅ DONE in SIMULATION-STATE.md
2. v1.4.0 confirmed deployed to all 7 shops
3. OI-32-01 and OI-32-02 both closed
4. OI-32-03 check-in notes filed
5. v1.5 backlog document present
6. Fourteenth dispatch filed
7. Phase 32 gate review GO

---

*WS32 Plan filed. Phase 32 is open.*
