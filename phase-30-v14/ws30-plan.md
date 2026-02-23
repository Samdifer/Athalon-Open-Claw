# WS30 Plan — Phase 30 Execution Plan
**Owners:** Nadia Solis + Marcus Webb + Devraj Anand + Cilla Roark + Jonas Harker
**Status:** ✅ DONE
**Simulation dates:** 2026-04-22 through 2026-05-10
**Filed:** 2026-04-22

---

## §1. Phase 30 Mission Summary

Phase 30 executes on six delivery items emerging directly from Phase 29:

1. **WS30-A** — Formal RMTS Caravan ALS Audit (N416AB, C208B/PT6A-114A, 2026-04-28). This is the first turbine-type ALS entry in Athelon — the audit Marcus scoped in Phase 29 Day 1 scoping call, committed to Dale Renfrow as a deliverable.

2. **WS30-B** — WO-RMTS-002 Combustion Liner Borescope Protocol Closure. Marcus applied an interim protocol to allow WO-RMTS-002 to proceed in Phase 29. This workstream formalizes the protocol as PROTO-RMTS-001 and closes WO-RMTS-002 with correct documentation.

3. **WS30-C** — F-1.4-B Build: Shop-Level ALS Compliance Dashboard (v1.4 Sprint 2). DOM-facing fleet compliance dashboard aggregating all aircraft ALS/CMR/AD status with OVERDUE → DUE_SOON → COMPLIANT priority sort. Anchor feature of v1.4 Sprint 2.

4. **WS30-D** — Lone Star Rotorcraft Post-ALS-Loop Follow-Up. CMR-04-70-003 is closed. N76LS has zero OVERDUE items. Sandra Okafor + Tobias Ferreira review the remaining DUE_SOON board and schedule work orders before the approaching intervals require emergency response.

5. **WS30-E** — Ridgeline Air Maintenance Pre-Onboarding Assessment (P-28-01). Nadia leads the pre-onboarding call. Decision: authorized / deferred / declined.

6. **WS30-F** — Miles Beaumont Twelfth Dispatch. What it means when an audit finds something real.

---

## §2. Team Roster and Roles

| Person | Role | Phase 30 Workstreams |
|---|---|---|
| **Nadia Solis** | Product lead, onboarding | WS30-E (Ridgeline call lead) |
| **Marcus Webb** | Compliance / technical lead | WS30-A (observer), WS30-B (protocol lead), WS30-C (compliance review), WS30-D (ALS board review) |
| **Devraj Anand** | Engineering lead | WS30-A (data entry), WS30-B (WO closure), WS30-C (build lead) |
| **Cilla Roark** | QA lead | WS30-C (test suite + TC matrix) |
| **Jonas Harker** | Product / legal / signoff | WS30-C (release gate) |
| **Dale Renfrow** | RMTS DOM (external) | WS30-A (audit lead), WS30-B (protocol co-author), WS30-C (UAT) |
| **Hector Ruiz** | RMTS A&P mechanic (external) | WS30-B (performed inspection) |
| **Sandra Okafor** | LSR DOM (external) | WS30-C (UAT), WS30-D (debrief lead) |
| **Tobias Ferreira** | LSR A&P helicopter (external) | WS30-D (DUE_SOON scheduling) |
| **Miles Beaumont** | Embedded journalist | WS30-F (dispatch author) |

---

## §3. Phase 30 Timeline

### Week 1: 2026-04-22 through 2026-04-25
**WS30-B — Protocol Closure Prep (Marcus + Dale, remote)**
- 2026-04-22: Marcus drafts PROTO-RMTS-001 from the WS29 interim protocol documentation and Pratt & Whitney CMM references
- 2026-04-23: Dale reviews PROTO-RMTS-001 draft; comments reconciled; protocol finalized
- 2026-04-24: PROTO-RMTS-001 filed in Athelon; WO-RMTS-002 updated to reference the filed protocol
- 2026-04-25: WO-RMTS-002 formally closed; closure documentation reviewed by Marcus and Devraj

**WS30-C — Sprint 2 Development Kickoff (Devraj + Cilla, internal)**
- 2026-04-22: Sprint 2 kickoff; schema additions reviewed and merged (PR #177)
- 2026-04-23: Convex query layer development begins (F-1.4-B backend)
- 2026-04-24: React dashboard component scaffolding; priority sort logic implementation begins
- 2026-04-25: Filter layer (shop/aircraft/item-type) implemented; Cilla begins TC matrix setup

### Week 2: 2026-04-28 through 2026-05-02
**WS30-A — RMTS Caravan ALS Audit (Dale + Marcus + Devraj, on-site KGJT)**
- 2026-04-28: Full-day audit session at RMTS hangar, Grand Junction CO
  - N416AB ALS board data entry (primary audit aircraft)
  - N208MP and N208TZ ALS boards reviewed and validated
  - Audit findings documented; immediate scheduling decisions made
  - Marcus signs off on Caravan ALS template (RMTS-OI-01 closed)

**WS30-C — Build Continues (Devraj + Cilla, internal)**
- 2026-04-28–04-30: Dashboard component integration; Cilla TC matrix testing (TC-01 through TC-14)
- 2026-05-01: Marcus compliance review; regulatory references verified
- 2026-05-02: UAT round begins — Dale Renfrow (RMTS) + Sandra Okafor (LSR) invited

**WS30-D — LSR Post-ALS Follow-Up (Sandra + Tobias + Marcus, remote call)**
- 2026-05-01: Review session — N76LS ALS board post-closure state; DUE_SOON items identified
- 2026-05-02: Work orders scheduled for DUE_SOON items; Sandra debrief recorded

### Week 3: 2026-05-05 through 2026-05-10
**WS30-C — UAT and Release (all)**
- 2026-05-05: Dale Renfrow UAT sign-off (RMTS fleet validated)
- 2026-05-06: Sandra Okafor UAT sign-off (LSR fleet validated)
- 2026-05-07: Jonas Harker release gate; WS30-C artifact filed

**WS30-E — Ridgeline Assessment (Nadia + Marcus, remote call)**
- 2026-05-06: Pre-onboarding call with Ridgeline Air Maintenance DOM
- 2026-05-07: Assessment artifact filed; decision recorded

**WS30-F — Miles Beaumont Dispatch**
- 2026-05-08: Dispatch filed

---

## §4. Dependencies and Sequencing

```
WS30-B ──────────────────────────────────────────── independent (Week 1)
WS30-A ──────────────────────────────────────────── Week 2 (depends on WS30-B for protocol
                                                      reference in ALS audit session)
WS30-C ──────────────┬─────────────────────────────── Week 1-3
                      └── UAT depends on WS30-A         (Dale UAT uses real Caravan ALS data)
WS30-D ──────────────────────────────────────────── Week 2 (independent of WS30-A)
WS30-E ──────────────────────────────────────────── Week 3 (independent)
WS30-F ──── depends on WS30-A finding details ──── Week 3
```

**Critical path:** WS30-B → WS30-A → WS30-C UAT → WS30-C release

**Key constraint:** The RMTS Caravan ALS audit (WS30-A, 2026-04-28) is the anchor event. Marcus committed this date to Dale Renfrow on 2026-04-14. This date does not move.

---

## §5. Open Items Carried from Phase 29

| OI ID | Description | Owner | Resolution Workstream |
|---|---|---|---|
| RMTS-OI-01 | Caravan ALS audit — template completion + N416AB/N208MP/N208TZ board activation | Marcus Webb | WS30-A |
| RMTS-OI-02 | F-1.4-A ships — migrate manual interval tracking to system for N208MP, N208TZ, N44RX | Devraj + Dale | v1.4 Sprint 1 (already shipped in Phase 29 WS29-B) — migration execution is post-WS30-A |
| OI-30-01 | WO-RMTS-002 Combustion Liner Borescope — formal protocol filing + WO closure | Marcus + Devraj | WS30-B |
| OI-30-02 | RMTS Caravan (N416AB) ALS Audit — scoped 2026-04-28 | Marcus | WS30-A |
| OI-29-02 | N76LS DUE_SOON items — Main Rotor Head Assembly, Tail Rotor Hub (and others) approaching interval | Sandra + Tobias | WS30-D |

---

## §6. Phase 30 Success Criteria

| Criterion | Owner | Target Date |
|---|---|---|
| WO-RMTS-002 formally closed; PROTO-RMTS-001 filed | Marcus | 2026-04-25 |
| N416AB ALS board live and validated; N208MP + N208TZ confirmed | Marcus + Devraj | 2026-04-28 |
| F-1.4-B shipped and UAT-signed by both Dale and Sandra | Devraj + Cilla | 2026-05-07 |
| N76LS DUE_SOON work orders scheduled | Sandra + Tobias | 2026-05-02 |
| Ridgeline decision issued | Nadia | 2026-05-07 |
| Twelfth dispatch filed | Miles Beaumont | 2026-05-08 |
| Phase 30 gate review artifact ready | Jonas | 2026-05-10 |

---

## §7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dale unavailable 2026-04-28 | Low (date committed) | High — anchor event | No mitigation needed; date set; Dale confirmed |
| F-1.4-B UAT scope creep | Medium | Medium | Cilla's TC matrix scoped to 14 test cases; UAT window fixed to 2 days |
| PT6A borescope protocol gap in CMM reference | Low | Medium | Marcus has PT6A-114A CMM document references from Phase 29 interim protocol work |
| Ridgeline assessment results in deferred decision | Medium | Low | Nadia has deferred-to-onboarding decision path documented |

---

## §8. Notes from Planning Session

**Nadia (2026-04-22 planning call):** "Phase 30 is the execution phase. We planned everything in Phase 29 — we scoped the Caravan audit, we built the WO-RMTS-002 protocol path, we scoped F-1.4-B. Phase 30 is where we deliver on every commitment we made to Dale and Sandra. The gate is: all six workstreams complete, both UAT sign-offs on F-1.4-B, audit artifact signed. Nothing ships without Marcus's compliance review."

**Marcus (2026-04-22):** "The Caravan ALS audit on the 28th is a significant event. Not because it's technically complex — it's not. The C208B airworthiness limitations section is clear. The PT6A-114A ICA LLP list is manageable. It's significant because it's the first turbine-type ALS entry in the system, and Dale Renfrow is the first shop DOM to hand that data to a software system instead of a spreadsheet. I want to be physically present for that. Devraj handles the data entry; I observe and validate. Dale leads — it's his aircraft, his data, his audit."

**Devraj (2026-04-22):** "F-1.4-B is Sprint 2. We've had the schema extension designed since the WS30-C scoping call. The Convex aggregation query is the interesting part — pulling OVERDUE/DUE_SOON/COMPLIANT counts across multiple aircraft, multiple item types, multiple shops. The dashboard component needs to be filter-ready at launch — shop/aircraft/item-type. Cilla and I will have TC-01 through TC-14 sequenced before the audit date."

**WS30 Plan is filed. Phase 30 is GO.**
