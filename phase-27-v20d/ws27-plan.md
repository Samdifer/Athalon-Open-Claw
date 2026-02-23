# WS27 Plan — Phase 27 Execution Plan
**Phase:** 27 (ACTIVE)
**Status:** ✅ FILED
**Filed:** 2026-02-23T~03:00Z
**Owners:** Nadia Solis + Marcus Webb + Devraj Anand + Cilla Oduya + Jonas Harker

---

## 1. Phase 27 Mission

Phase 27 closes three open conditions from the Phase 26 gate review and locks the v1.3 feature backlog. The three conditions carry material compliance weight:

- **OC-26-01** (HIGH): Frank Nguyen's three Category 3 DST records — one of which is a live PT6A-series AD applicability question — have a 30-day clock running from Phase 26 ship. The clock closes this phase.
- **OC-26-02** (HIGH): Bell 206B-III ALS audit and mandatory service instruction (SI) tracking layer. Lone Star Rotorcraft operates three Bell 206B-III JetRangers (N411LS, N412LS, N413LS). Sandra is tracking Bell mandatory SIs in a paper binder. That is the current state of compliance for those aircraft in Athelon. This phase closes that gap.
- **OC-26-03** (MEDIUM): Sikorsky S-76C Part 29 ALS audit. N76LS has been in Athelon's aircraft registry since Day 1 of Lone Star onboarding. Compliance surface features are OFF. Part 29 is a different regulatory standard than Part 27. The audit is required before those features can be enabled.

Beyond the open conditions, Phase 27 locks v1.3 features and files the ninth Miles Beaumont dispatch.

---

## 2. Phase 26 Open Conditions Summary

| Condition | Severity | Owner | 30-Day Clock? | Phase 27 Workstream |
|---|---|---|---|---|
| OC-26-01: Frank Nguyen Cat-3 records (3 items, PT6A compressor AD highest risk) | HIGH | Frank Nguyen + Marcus Webb | ✅ YES — started Phase 26 ship | WS27-C |
| OC-26-02: Bell 206B-III ALS + mandatory SI tracking layer | HIGH | Marcus Webb + Tobias Ferreira + Devraj Anand + Cilla | None | WS27-A |
| OC-26-03: S-76C Part 29 ALS audit | MEDIUM | Marcus Webb + Devraj Anand + Cilla | None | WS27-B |

---

## 3. Workstream Sequencing

Phase 27 runs five workstreams. Sequencing is governed by two constraints:

1. **OC-26-01 (WS27-C) has a 30-day clock.** It runs in parallel with the Bell and S-76C audits, not after them. Frank's variant/serial-number research is happening in real time.
2. **WS27-B (S-76C) should read WS27-A (Bell) first.** The S-76C audit extends the Bell precedent. WS27-A should be in DONE state before WS27-B is finalized. They may run in parallel but WS27-B's data model section depends on WS27-A's `siItems` schema.

**Sequencing:**

```
WS27 Plan (this document) ──► WS27-A + WS27-C in parallel
                                      │
                              WS27-A ──► WS27-B (reads WS27-A)
                                              │
                                    WS27-D (v1.3 planning) after A+B+C confirm scope
                                              │
                                    WS27-E (dispatch) after all technical work complete
```

**Critical path:** OC-26-01 (WS27-C) 30-day clock is the binding constraint. If Record 22 (PT6A compressor AD) is found applicable and Desert Sky is non-compliant, a compliance hold is issued. This is not a blocking condition for the Phase 27 gate — it is a compliance action that runs independently — but it must be documented and dispatched to Marcus before any gate convene.

---

## 4. Team Assignments

| Workstream | Lead | Support | SME | QA | Compliance |
|---|---|---|---|---|---|
| WS27-A Bell 206B-III ALS + SI Tracking | Marcus Webb | Devraj Anand | Tobias Ferreira (turbine-rated, Bell 206B-III, LSR) | Cilla Oduya | Marcus Webb |
| WS27-B S-76C Part 29 ALS Audit | Marcus Webb | Devraj Anand | — (Marcus is Part 29 SME for this audit) | Cilla Oduya | Marcus Webb |
| WS27-C DST FSDO Readiness + OC-26-01 Close | Marcus Webb | Devraj Anand | Frank Nguyen (DST DOM) | Cilla (test coverage reviewed) | Marcus Webb |
| WS27-D v1.3 Feature Planning | Nadia Solis | Marcus Webb + Devraj Anand | — | Cilla Oduya | Marcus Webb |
| WS27-E Miles Beaumont Dispatch | Miles Beaumont | — | — | — | — |

**Tobias Ferreira role expansion:** Tobias was the Robinson SME in Phase 26 (WS26-A). In Phase 27, he also serves as Bell 206B-III SME. Tobias holds a turbine rating and has Bell 206B-III experience from his Lone Star Rotorcraft work. His SME brief in WS27-A will document the Bell-specific compliance distinctions.

---

## 5. Success Criteria Per Workstream

### WS27-A (Bell 206B-III ALS + SI Tracking)
- Tobias SME brief complete: Bell ALS vs. R44 ALS differences explained; Bell mandatory SI vs. FAA AD distinction documented; turbine ALS categories enumerated; failure risk of missing a Bell SI documented
- Bell 206B-III ALS items enumerated with actual life limits from Bell MM/ICA
- `siItems` data model designed: separate from `alsItems`, mandatory SI tracking schema, compliance state machine
- Mutations: createSiItem, updateSiCompliance, closeSiItem
- Dashboard query: SI compliance board per aircraft
- Cilla: ≥8 test cases PASS
- Marcus: Part 27 + Bell ICA attestation signed
- OC-25-02 and OC-26-02 explicit closure statements

### WS27-B (S-76C Part 29 ALS Audit)
- Part 27 vs. Part 29 ALS difference brief documented
- S-76C ALS items enumerated with actual life limits
- Data model extended for Part 29 dual-compliance tracking
- Cilla test cases PASS
- Marcus Part 29 compliance attestation signed
- OC-26-03 explicit closure statement

### WS27-C (DST FSDO Readiness)
- Frank's three Category 3 records resolved with documented disposition
- FSDO-ready audit package produced for each record: audit trail, corrective action evidence, compliance disposition
- Marcus monitoring sign-off on each resolution
- OC-26-01 30-day clock closure statement
- If Record 22 (PT6A compressor AD) is applicable: compliance WO opened and status documented

### WS27-D (v1.3 Planning)
- v1.3 feature set locked: Bell/S-76C ALS tracking UI, mandatory SI dashboard, FSDO audit export, OPEN-2C-01 carry-forward
- Team capacity assessed
- Sprint sequencing defined (number of sprints, sprint contents)
- Nadia, Marcus, Devraj, Cilla, Jonas sign-offs

### WS27-E (Miles Beaumont Dispatch)
- Written in Miles's voice
- Theme: the helicopter shop — what it means that Lone Star is on Athelon
- Grounded in Phase 27 specifics: Bell 206 demands, N224LS drive belt finding, Sandra as DOM
- Long-form narrative

---

## 6. Phase 27 Gate Criteria

Phase 27 gate review is GO when:

1. WS27-A through WS27-E all filed with PASS status
2. OC-26-01 (30-day clock) closed with documented disposition for all 3 Category 3 records
3. OC-26-02 closed (Bell 206B-III ALS + SI tracking layer designed and implemented)
4. OC-26-03 closed (S-76C Part 29 ALS audit complete)
5. v1.3 backlog locked with all team sign-offs
6. Miles Beaumont ninth dispatch filed
7. Marcus Webb compliance sign-off on all regulatory-touching workstreams

**Gate condition note:** If Record 22 is found applicable to Desert Sky's fleet and Desert Sky is non-compliant, this does not block the Phase 27 gate verdict — it creates a compliance action item tracked on the affected aircraft and assigned a compliance hold. The gate may proceed with that item in active-resolution status and explicitly documented.

---

## 7. Phase 27 Scope Boundaries

**In scope:**
- Bell 206B-III ALS audit + mandatory SI tracking layer design + Convex implementation
- Sikorsky S-76C Part 29 ALS audit + data model extension
- Desert Sky Turbine Category 3 record resolution + FSDO audit readiness package
- v1.3 feature backlog lock
- Miles Beaumont ninth dispatch

**Out of scope:**
- New shop onboarding (Phase 28 candidate)
- Bell 206B-III compliance surface activation for production (follows WS27-A ship; no additional gate required)
- S-76C compliance surface activation for production (follows WS27-B ship)
- Any Part 135 compliance work (not yet authorized for Lone Star; separate gate required)
- OPEN-2C-01 implementation (v1.3 scope — planning only in WS27-D)
- Phase 28 planning (gate review + orchestrator responsibility)

---

*WS27 Plan filed: 2026-02-23*
*Signatories: Nadia Solis (Customer Success), Marcus Webb (Compliance), Devraj Anand (Engineering), Cilla Oduya (QA), Jonas Harker (Infrastructure)*
