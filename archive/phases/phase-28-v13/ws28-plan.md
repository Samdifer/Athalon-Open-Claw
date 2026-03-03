# WS28 Plan — Phase 28 Execution Plan
**Phase:** 28 (ACTIVE)
**Status:** ✅ COMPLETE
**Filed:** 2026-02-23

**Owners:**
- Nadia Solis — Product / Customer Success (sprint delivery, UAT coordination)
- Marcus Webb — Compliance Architect (regulatory sign-off sequencing, CC-27-01 monitoring)
- Devraj Anand — Engineering (sprint execution lead)
- Cilla Oduya — QA (test execution across all sprints)
- Jonas Harker — Infrastructure (release delivery, background job queue)

---

## 1. Phase 28 Mission

v1.3 sprint execution. Phase 27 designed everything; Phase 28 builds and ships it.

Five features enter build: Bell 206B-III ALS Tracking UI (F-1.3-A), S-76C Part 29 ALS Tracking UI (F-1.3-B), Mandatory SI Dashboard (F-1.3-C), FSDO Audit Export (F-1.3-D), Repairman Certificate Employer-Transition Warning (F-1.3-E).

Two carry-forward conditions from Phase 27 are resolved in parallel with the build:
- **CC-27-01:** WO-DST-FPI-001 PT6A compressor FPI — scheduled 2026-03-12. Frank confirms completion; Marcus records return-to-service; N9944P returns to operation.
- **CC-27-02:** Repetitive AD interval tracking enhancement — Marcus and Devraj assess, make a scheduling decision (v1.4, v2.0, or deprioritize), and close the condition.

One operational workstream proceeds independently: N76LS (Lone Star Rotorcraft S-76C) initial ALS data entry session with Sandra Okafor. The UI ships in v1.3 (F-1.3-B); the data entry session is the operational follow-through.

Shop pipeline review and Miles Beaumont's tenth dispatch complete the phase.

---

## 2. Sprint Sequencing

### Sprint 1 — 2 weeks (~2026-03-02 to 2026-03-15)
**Theme:** Bell 206B-III ALS Tracking UI + Mandatory SI Dashboard

| Feature | Owners | Dependencies |
|---|---|---|
| F-1.3-A: Bell 206B-III ALS Tracking UI (aircraft-level + fleet-level) | Chloe Park + Finn Calloway + Devraj Anand | WS27-A `alsItems` + `siItems` backends |
| F-1.3-C: Mandatory SI Dashboard (fleet alert panel + per-aircraft SI board + compliance workflow) | Chloe Park + Devraj Anand | WS27-A `getSiComplianceDashboard` + `getFleetSiAlerts` |
| TC-1.3-A + TC-1.3-C test suites | Cilla Oduya | Sprint 1 features in staging |
| Sprint 1 sign-off | All owners | All TC-1.3-A and TC-1.3-C PASS |

**Sprint 1 success criteria:**
- ALS board renders for N411LS, N412LS, N413LS with correct items, urgency sorting, and compliance state.
- Bell 206B-III ALS item template library functional (23 pre-filled items).
- Mandatory SI fleet alert panel visible on DOM dashboard home; NONCOMPLIANT items shown in red.
- SI compliance workflow (Mark Compliant → select WO → confirm) executes and calls `closeSiItem`.
- Paper binder migration banner on first SI board visit.
- 6+ Cilla test cases PASS. Zero failures.
- Sprint 1 sign-off recorded.

---

### Sprint 2 — 2 weeks (~2026-03-16 to 2026-03-29)
**Theme:** S-76C Part 29 ALS Tracking UI + FSDO Audit Export

| Feature | Owners | Dependencies |
|---|---|---|
| F-1.3-B: S-76C Part 29 ALS Tracking UI (Part 29 badge, CMR section, dual-authority display) | Chloe Park + Finn Calloway + Devraj Anand | WS27-B `alsItems` Part 29 extension fields; F-1.3-A component patterns |
| F-1.3-D: FSDO Audit Export (compliance audit PDF template, scope options, background queue) | Devraj Anand + Jonas Harker | Phase 16 PDF infra (WS16-C); Marcus template review |
| TC-1.3-B + TC-1.3-D test suites | Cilla Oduya | Sprint 2 features in staging |
| Marcus compliance review: FSDO export template | Marcus Webb | Draft template from Devraj |
| Sprint 2 sign-off | All owners | All TC-1.3-B and TC-1.3-D PASS |

**Sprint 2 success criteria:**
- N76LS ALS board displays Part 29 badge.
- CMR items grouped in "Certification Maintenance Requirements" section.
- Dual-authority engine items show "Engine Authority: Turbomeca Arriel 2S1 ICA" inline.
- FSDO export generates complete compliance PDF with all ALS/SI/AD records; no open items omitted.
- Export scope options: single aircraft / all org aircraft / date range filter.
- Export generation uses background job queue (Jonas's 1-day infra task).
- TC-1.3-D-01 (open items completeness): PASS is mandatory before Sprint 2 sign-off.
- Marcus FSDO export template review complete; PDF header includes export date, system name, data-as-of statement.
- Sprint 2 sign-off recorded.

---

### Sprint 3 — 1 week (~2026-03-30 to 2026-04-05)
**Theme:** Repairman Cert Warning + Integration + UAT + Release

| Task | Owners | Dependencies |
|---|---|---|
| F-1.3-E: Repairman Certificate Employer-Transition Warning | Devraj Anand + Chloe Park | User offboarding flow |
| TC-1.3-E test cases | Cilla Oduya | F-1.3-E in staging |
| Integration testing: full v1.3 (F-1.3-A through F-1.3-E) | Cilla Oduya | All sprint features |
| Marcus compliance final sign-off: F-1.3-A through F-1.3-E | Marcus Webb | All sprint features complete |
| UAT: Sandra Okafor (Bell ALS UI + SI dashboard) | Sandra Okafor + Nadia Solis | Sprint 1 features |
| UAT: Frank Nguyen (FSDO export) | Frank Nguyen + Nadia Solis | Sprint 2 features |
| UAT: Priya Sharma (compliance surface general) | Priya Sharma + Nadia Solis | All sprints |
| Release checklist + deployment plan | Jonas Harker | Integration PASS |
| v1.3 release notes | Nadia Solis | All features |
| Sprint 3 + release sign-off | All owners | All criteria met |

**Sprint 3 success criteria:**
- F-1.3-E: Warning fires on employer transition for Repairman certificate holders. DOM sees warning; certificate holder does not. DOM "Mark as Reviewed" logged.
- OPEN-2C-01 closed.
- Integration test: zero FAIL items across all five features.
- Sandra Okafor UAT sign-off: Bell ALS UI + Mandatory SI Dashboard.
- Frank Nguyen UAT sign-off: FSDO audit export.
- Priya Sharma UAT participation confirmed.
- Marcus compliance clearance: all five features.
- Jonas release readiness PASS.
- v1.3 ships ~2026-04-07.

---

## 3. Parallel Workstreams

These run concurrently with the sprints and do not block sprint execution.

| Workstream | Owner(s) | Target Completion | Notes |
|---|---|---|---|
| WS28-D: CC-27-01 Close — WO-DST-FPI-001 / N9944P RTS | Frank Nguyen + Marcus Webb | 2026-03-12 to 2026-03-20 | Inspection scheduled 2026-03-12; Marcus receipt follows |
| WS28-E: CC-27-02 Scheduling — Repetitive AD Tracking Decision | Marcus Webb + Devraj Anand | By Sprint 2 start | Decision does not block any sprint |
| WS28-F: N76LS ALS Data Entry Session | Sandra Okafor + Marcus Webb | Sprint 3 or post-release | Requires F-1.3-B in staging or production |
| WS28-G: Shop Pipeline Review | Nadia Solis | Week 3 (~2026-03-23) | Independent; informs Phase 29 planning |
| WS28-H: Miles Beaumont Tenth Dispatch | Miles Beaumont | Near v1.3 ship date | Requires knowing v1.3 shipped and WO-DST-FPI-001 complete |

---

## 4. Team Assignments

| Person | Role | Sprint 1 | Sprint 2 | Sprint 3 | Parallel |
|---|---|---|---|---|---|
| Devraj Anand | Engineering Lead | F-1.3-A backend + F-1.3-C SI workflow | F-1.3-B Part 29 ext + F-1.3-D FSDO export | F-1.3-E trigger + integration | WS28-E (CC-27-02 brief) |
| Chloe Park | Frontend Lead | F-1.3-A ALS board components + F-1.3-C UI | F-1.3-B Part 29 UI + F-1.3-D export trigger | F-1.3-E modal/banner | — |
| Finn Calloway | Frontend | F-1.3-A + F-1.3-C support | F-1.3-B support | 50% (pre-committed) | — |
| Jonas Harker | Infrastructure | 50% (monitoring) | Background export queue | Release deployment | — |
| Cilla Oduya | QA | TC-1.3-A + TC-1.3-C | TC-1.3-B + TC-1.3-D | TC-1.3-E + Integration | — |
| Marcus Webb | Compliance | Async review only (30%) | FSDO template review (30%) | Full sign-off | WS28-D + WS28-E |
| Nadia Solis | Product/CS | Pre-scoping (50%) | Pre-scoping (50%) | UAT coordination | WS28-G + WS28-H coordination |
| Sandra Okafor | UAT / Data Entry | — | — | UAT Sprint 3 | WS28-F data entry |
| Frank Nguyen | UAT / CC-27-01 | — | — | UAT Sprint 3 | WS28-D FPI confirmation |

---

## 5. Carry-Forward Priority

| ID | Description | Owner | Resolution Path | Priority |
|---|---|---|---|---|
| CC-27-01 | WO-DST-FPI-001 — N9944P PT6A compressor FPI. Aircraft grounded. | Frank + Marcus | FPI complete 2026-03-12 → Marcus compliance receipt → return to service authorization | **HIGH — aircraft grounded** |
| CC-27-02 | Repetitive AD interval tracking — gap identified in WS27-C. No automatic system tracking. | Marcus + Devraj | Brief → scheduling decision (v1.4/v2.0/deprioritize) → CC-27-02 closed | **MEDIUM — no aircraft grounded; decision required** |

CC-27-01 is the highest priority item in Phase 28 that does not affect sprint delivery. N9944P is on the ground. The FPI must be completed and the return-to-service authorization issued.

---

## 6. Success Criteria — Phase 28 Overall

1. v1.3 shipped (~2026-04-07): all five features (F-1.3-A through F-1.3-E) in production.
2. CC-27-01 closed: N9944P returned to service with AD compliance interval reset.
3. CC-27-02 closed: scheduling decision made and recorded (even if deferred).
4. N76LS ALS data entry complete: all 33 S-76C ALS/CMR items entered for N76LS; Sandra sign-off.
5. Shop pipeline reviewed: recommendation for Phase 29 onboarding (if any) filed.
6. Miles Beaumont tenth dispatch filed.
7. All Phase 28 workstream artifacts present and signed off.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FSDO export PDF template review with Marcus runs long (Sprint 2 schedule risk) | Medium | Sprint 2 slip | Jonas on standby; background queue implementation is parallel to template design |
| WO-DST-FPI-001 delayed (P&WC facility schedule) | Low | N9944P remains grounded; CC-27-01 stays open | Frank monitors; Marcus escalation path if delay exceeds 2 weeks past 2026-03-12 |
| N76LS data entry session scheduling conflict (Sandra + Marcus availability) | Medium | Data entry deferred to Phase 29 | F-1.3-B ships regardless; data entry is operational, not a gate condition |
| Cilla integration test reveals cross-feature regression | Low | Sprint 3 slip; potential delay to v1.3 | Standard: fix before release; Cilla has Sprint 3 week fully allocated |

---

## 8. Phase 28 Plan Sign-Offs

**Nadia Solis:** Sprint sequencing correct. Sandra Okafor and Frank Nguyen UAT in Sprint 3 is confirmed. Shop pipeline review targeted for week 3. Miles Beaumont will have the story once v1.3 ships and N9944P is back in service. ✅ APPROVED

**Marcus Webb:** CC-27-01 is my top priority. WO-DST-FPI-001 closes out the most serious finding from Phase 27. The sprint plan gives me full compliance clearance authority in Sprint 3 — that's when I need it. I'll do async review in Sprints 1 and 2. ✅ APPROVED

**Devraj Anand:** FSDO export is the hardest single engineering task. Jonas on standby for Sprint 2 infrastructure is the right call. Sprint 1 and 2 are well-sequenced. ✅ APPROVED

**Cilla Oduya:** TC-1.3-D-01 (FSDO export open items completeness) is my named highest-priority test. Integration week in Sprint 3 is fully blocked. ✅ APPROVED

**Jonas Harker:** Background export queue is a 1-day Sprint 2 infrastructure task. Release delivery in Sprint 3 confirmed. ✅ APPROVED

---

*WS28 Plan filed: 2026-02-23*
*Sprint kick-off: ~2026-03-02*
*v1.3 target release: ~2026-04-07*
