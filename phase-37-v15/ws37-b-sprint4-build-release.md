# WS37-B — Sprint 4 Build + Release (Signal Tuning + Adoption UX)
**Phase:** 37
**Status:** ✅ DONE
**Dates:** 2026-11-28 through 2026-12-19
**Owners:** Devraj Anand (Engineering Lead) · Cilla Oduya (QA/Test) · Marcus Webb (Compliance) · Jonas Harker (Release Gate)
**Release tag:** v1.5.0-sprint4
**Sprint cadence:** 3-week execution window, 2-week QA + compliance, 1-week release wave

---

## 1) Sprint 4 Intake — Confirmed Scope

Sprint 4 scope was locked in WS36-C (v1.5.0-sprint3 Production Stability + Sprint 4 Intake, Phase 36). The following items were pulled into Sprint 4 Priority 1 and Priority 2:

### Priority 1 — Alert-Signal Quality Improvements
| Feature ID | Feature Name | Origin | Marcus Compliance Review |
|---|---|---|---|
| F-1.5-F-P1 | Alert Threshold Tuning (false positive reduction) | Phase 36 production feedback | Required — completed 2026-11-14 |
| F-1.5-F-P2 | Per-Aircraft Applicability Filter (AD/SB noise suppression) | FR-36-01 (Paul Kaminski, WFAS) | Required — completed 2026-11-14 |
| F-1.5-F-P3 | Alert Digest Mode (DOM daily summary email vs. real-time noise) | FR-36-02 (Dale Renfrow, RMTS) | Required — completed 2026-11-15 |

### Priority 2 — Protocol Adoption UX
| Feature ID | Feature Name | Origin | Marcus Compliance Review |
|---|---|---|---|
| F-1.5-G-P1 | Onboarding Flow Improvements (new-shop Day 1 guided experience) | Retrospective — Lorena + Paul onboarding observations | Not required (UX only) |
| F-1.5-G-P2 | Shop Dashboard Enhancement — Protocol Coverage Widget | FR-36-03 (Marcus) | Not required (UX + display) |
| F-1.5-G-P3 | Template Version Notification UX — clearer diff presentation | FR-35-01 carry-forward | Not required (UX only) |

**Total sprint scope:** 6 feature threads

---

## 2) Marcus Compliance Pre-Build Reviews

Marcus completed three compliance reviews prior to build start. Key findings:

### F-1.5-F-P1 — Alert Threshold Tuning
**Review date:** 2026-11-14
**Finding:**
> "Threshold relaxation must not suppress mandatory item alerts. All OVERDUE-state alerts must remain non-suppressible regardless of threshold settings. Acceptable: tune DUE_SOON advance-notice windows per aircraft type (turbine vs. piston) and per-item category (hard life limit vs. AD repeat interval). Not acceptable: any user-configurable threshold that affects OVERDUE or <30-day-to-limit firing. Recommend retaining DOM-only threshold control with per-item override log for audit trail."
**Decision:** Build approved with constraint — DOM-only threshold access; OVERDUE alerts non-suppressible; all threshold changes logged.

### F-1.5-F-P2 — Per-Aircraft Applicability Filter
**Review date:** 2026-11-14
**Finding:**
> "Applicability filtering must be based on verified aircraft identity fields (aircraft type, engine series, configuration fields). Filter rules must be visible to DOM and exportable in FSDO audit package. An applicability filter that silences an AD must produce a DOM confirmation prompt with AD number, justification field, and date-stamp — not a silent discard."
**Decision:** Build approved with constraint — AD filter requires DOM confirmation with justification field; confirmation logged.

### F-1.5-F-P3 — Alert Digest Mode
**Review date:** 2026-11-15
**Finding:**
> "Digest mode is acceptable provided OVERDUE items are always sent immediately, not batched. DUE_SOON and advisory items may be batched. DOM must be able to confirm digest mode subscription via explicit opt-in (not default). Emergency AD alerts (AD with note of immediate safety concern in title) must bypass digest."
**Decision:** Build approved with constraints as described.

---

## 3) Build Execution

**Engineering team:**
- Devraj Anand — Backend (Convex mutations, alert engine, digest scheduler, applicability filter logic)
- Chloe Park — Frontend (onboarding flow, dashboard widgets, template diff UX)
- Finn Calloway — Frontend (alert preferences UI, DOM alert settings panel)
- Cilla Oduya — QA (test plan authorship + test execution)

**Build timeline:**
| Week | Focus |
|---|---|
| W1 (2026-11-28 to 2026-12-05) | F-1.5-F-P1 + F-1.5-F-P2 backend logic; alert engine refactor |
| W2 (2026-12-06 to 2026-12-12) | F-1.5-F-P3 digest scheduler; F-1.5-G-P1/G-P2/G-P3 frontend |
| W3 (2026-12-13 to 2026-12-19) | Integration, QA, compliance review, Jonas gate |

---

## 4) Feature Implementations

### 4.1 F-1.5-F-P1 — Alert Threshold Tuning

**Backend changes (Devraj):**
- New `alertThresholds` sub-document on `repairStation` schema:
  ```
  alertThresholds: {
    turbineDueSoonDays: number (default 90),
    pistonDueSoonDays: number (default 60),
    adRepeatApproachingDays: number (default 45),
    overrideItems: [{alsItemId, customDayThreshold, setBy, setAt, reason}]
  }
  ```
- Alert engine (`_cron/alsAlertSweep.ts`) updated to consume per-shop threshold settings
- OVERDUE alert (<0 remaining cycles or past date) hardcoded as non-suppressible — `if (status === 'OVERDUE') fireAlert()` — no threshold check
- DOM-only mutation `setAlertThreshold` added; non-DOM role attempt returns 403 with user-visible message
- All threshold changes written to `alertThresholdAuditLog` collection with actor, timestamp, old value, new value

**Cilla test results (F-1.5-F-P1):** 18/18 TCs PASS
- TC-P1-01 through TC-P1-06: threshold persistence and correct DUE_SOON window behavior for turbine/piston/custom — PASS
- TC-P1-07 through TC-P1-10: OVERDUE non-suppressibility under any threshold value — PASS
- TC-P1-11 through TC-P1-14: DOM-only access enforcement (mechanic attempt → 403) — PASS
- TC-P1-15 through TC-P1-18: audit log completeness (old/new/actor/timestamp) — PASS

---

### 4.2 F-1.5-F-P2 — Per-Aircraft Applicability Filter

**Backend changes (Devraj):**
- New `applicabilityFilters` collection: `{adNumber, aircraftId, filterBasis, domConfirmation: {confirmed, justification, confirmedAt, confirmedBy}}`
- Regulatory change alert delivery logic updated: before firing AD alert to DOM, check applicability filter; if filter exists and confirmed, suppress alert + log suppression event
- If no filter — alert fires as normal
- New mutation `setApplicabilityFilter` requires DOM role; triggers confirmation prompt in frontend before saving
- FSDO audit export updated: new section "AD Applicability Filter Log" exports all active filters with DOM confirmation details

**Frontend changes (Finn):**
- AD alert card has new "Mark as Not Applicable" action (DOM only)
- Clicking opens modal: AD number (read-only), aircraft identity summary, justification text field (required, 20 char min), confirmation button
- Suppressed AD alerts show as "Filtered — [AD number] — Marked non-applicable by [DOM name] on [date]" in alert history (not silently removed)

**Cilla test results (F-1.5-F-P2):** 16/16 TCs PASS
- TC-P2-01 through TC-P2-04: applicability filter creation (happy path, DOM role) — PASS
- TC-P2-05 through TC-P2-07: confirmation prompt enforcement (no silent save without justification) — PASS
- TC-P2-08 through TC-P2-10: suppression behavior (filtered alert not delivered; suppression event logged) — PASS
- TC-P2-11 through TC-P2-13: FSDO export inclusion of filter log — PASS
- TC-P2-14 through TC-P2-16: non-DOM role attempt enforcement — PASS

---

### 4.3 F-1.5-F-P3 — Alert Digest Mode

**Backend changes (Devraj):**
- New `alertDelivery` preference field on `user` schema: `{mode: 'immediate' | 'digest', digestFrequency: 'daily' | 'weekly', digestTime: HH:MM, optInAt: timestamp}`
- Default mode: `immediate` (no change in behavior unless user explicitly opts in to digest)
- Digest scheduler cron job (`_cron/alertDigestSend.ts`): queries all pending DUE_SOON/advisory alerts for digest-mode users; composes summary email; delivers via SendGrid; marks alerts as `digestDelivered`
- Bypass logic: OVERDUE alerts always fire immediately regardless of digest preference; AD alerts flagged as emergency (`isEmergency: true`) always fire immediately
- `isEmergency` flag set by Marcus's review queue when AD has "immediate airworthiness concern" language in title or summary

**Frontend changes (Chloe):**
- New "Alert Delivery" card in user Settings panel
- Clear opt-in flow: "Switch to Digest Mode" toggle + frequency selector + time picker + confirmation modal explaining immediate-override behavior
- Current mode indicator shown on notification preferences page

**Cilla test results (F-1.5-F-P3):** 14/14 TCs PASS
- TC-P3-01 through TC-P3-04: digest schedule creation and opt-in flow — PASS
- TC-P3-05 through TC-P3-07: OVERDUE immediate bypass (never held for digest) — PASS
- TC-P3-08 through TC-P3-09: emergency AD bypass — PASS
- TC-P3-10 through TC-P3-12: digest email content correctness (DUE_SOON + advisory items grouped) — PASS
- TC-P3-13 through TC-P3-14: mode toggle and preference persistence — PASS

---

### 4.4 F-1.5-G-P1 — Onboarding Flow Improvements

**Background:** Post-onboarding retrospectives from Lorena Vásquez (Phase 33) and Paul Kaminski (Phase 35) both surfaced the same friction: the ALS board initial data-entry experience — specifically the seed-data validation step — lacked clear guidance about what to validate against and in what order. Lorena spent six hours cross-referencing logbooks; Paul's team re-entered two aircraft twice due to confusion about entry sequence.

**Frontend changes (Chloe + Finn):**
- New `OnboardingChecklist` component shown to DOM users on first login and until all aircraft have at least one ALS item entry
- Checklist steps:
  1. "Enter your first aircraft" → links to Aircraft entry form
  2. "Validate ALS seed data against logbooks" → opens ALS board with inline tooltip: "Compare each entry against your physical logbooks. Check: cycle count, date of last replacement, part number."
  3. "Have a second set of eyes review" → reminder prompt (dismissible; suggested reviewer: Athelon compliance team)
  4. "Mark board as validated" → DOM confirmation click; records `alsBoard.seedValidated = true, validatedBy, validatedAt`
- Progress tracker shown in sidebar throughout onboarding (collapsible once complete)
- "Onboarding complete" banner fires when all aircraft boards are marked validated

**Cilla test results (F-1.5-G-P1):** 10/10 TCs PASS
- Checklist rendering and progression — PASS
- `seedValidated` flag mutation and persistence — PASS
- Sidebar tracker state management — PASS
- Completion banner trigger — PASS

---

### 4.5 F-1.5-G-P2 — Shop Dashboard Enhancement: Protocol Coverage Widget

**Background:** Marcus and Paul Kaminski discussion in Phase 36 identified that DOMs cannot currently see, at a glance, what fraction of their scheduled inspection types have an adopted protocol (template) in Athelon vs. are still being done from paper or memory. This is the "dark zone" of protocol adoption — you can't improve what you can't see.

**Frontend changes (Chloe):**
- New "Protocol Coverage" widget on Shop Dashboard home page (DOM-facing)
- Widget shows: Total inspection event types in last 90 days / Events with an adopted protocol in Athelon / Coverage % / "Events without protocol" list (clickable — opens Protocol Library with suggested templates)
- Coverage % displayed as donut chart with color coding: <50% = amber, ≥50% = yellow, ≥80% = green
- "Suggested templates" column shows available base templates from Marcus's protocol library for each uncovered event type

**Backend changes (Devraj):**
- New query `getProtocolCoverageStats` on `workOrder` collection: counts WOs by inspection type category; joins to `protocols` collection on `workOrderType`; returns coverage ratio
- Coverage stats cached per-shop every 6 hours (cron refresh)

**Cilla test results (F-1.5-G-P2):** 12/12 TCs PASS
- Widget rendering and data binding — PASS
- Coverage calculation accuracy (manual test cases) — PASS
- Donut chart color thresholds — PASS
- Clickthrough to Protocol Library — PASS
- Caching behavior — PASS

---

### 4.6 F-1.5-G-P3 — Template Version Notification UX: Clearer Diff Presentation

**Background:** When Marcus publishes an updated version of a base template (e.g., PT6A-114A borescope base template v1.1 → v1.2), shops that have adopted the template receive a notification, but feedback from Dale Renfrow and Lorena indicated the notification did not clearly show what changed — just "new version available." Shops were dismissing without reviewing.

**Frontend changes (Finn):**
- Template version notification now includes inline diff panel:
  - Added steps: highlighted in green with "NEW" badge
  - Removed steps: struck through in red with "REMOVED" badge
  - Modified steps: shown side-by-side (old text / new text) with "CHANGED" badge
  - Required step changes: flagged separately with orange "REQUIRED STEP CHANGED" banner
- DOM can: "Accept and Update" (adopts new version) / "Review Later" (snoozes 7 days, re-notifies) / "Keep Current Version" (explicit rejection — logged with timestamp)

**Backend changes (Devraj):**
- New `templateVersionDiff` utility function: computes structured diff between two template versions
- Diff result stored on `protocolTemplate` document alongside each version
- Notification mutation updated to include `diffPayload` in push notification data

**Cilla test results (F-1.5-G-P3):** 11/11 TCs PASS
- Diff computation accuracy (add/remove/change/required step scenarios) — PASS
- UI rendering of diff panel — PASS
- Accept/Review Later/Keep options and persistence — PASS
- Required step change banner — PASS

---

## 5) Integration Testing

**QA lead:** Cilla Oduya
**Integration test run date:** 2026-12-15 through 2026-12-17
**Test environment:** Staging (all 9 shops deployed with Sprint 4 build)

### 5.1 Sprint 4 New Feature TCs

| Feature | New TCs | PASS | FAIL |
|---|---|---|---|
| F-1.5-F-P1 Alert Threshold Tuning | 18 | 18 | 0 |
| F-1.5-F-P2 Per-Aircraft Applicability Filter | 16 | 16 | 0 |
| F-1.5-F-P3 Alert Digest Mode | 14 | 14 | 0 |
| F-1.5-G-P1 Onboarding Flow | 10 | 10 | 0 |
| F-1.5-G-P2 Protocol Coverage Widget | 12 | 12 | 0 |
| F-1.5-G-P3 Template Version Diff UX | 11 | 11 | 0 |
| **Sprint 4 Total** | **81** | **81** | **0** |

### 5.2 Regression Suite

**Regression scope:** v1.5.0-sprint3 full regression suite (284 TCs) re-run against Sprint 4 build

| Category | TCs | PASS | FAIL | Notes |
|---|---|---|---|---|
| ALS board core | 58 | 58 | 0 | |
| WO lifecycle | 44 | 44 | 0 | |
| Protocol library / adoption | 31 | 31 | 0 | |
| Regulatory change tracking | 27 | 27 | 0 | |
| FSDO export | 22 | 22 | 0 | Updated with filter log section |
| Procurement workflow | 18 | 18 | 0 | |
| Alert engine core | 34 | 34 | 0 | Refactored — all regression clear |
| Mobile / ramp view | 21 | 21 | 0 | |
| Auth / roles | 29 | 29 | 0 | |
| **Regression total** | **284** | **284** | **0** | |

**Combined total: 365/365 PASS**

**One defect found and resolved during QA window:**
- **DEF-37-01** (Sev3): Alert digest cron job was computing digest time in UTC but user preference stored in local timezone — DOMs in Mountain Time were receiving digest emails at incorrect local time. Fixed in backend by Devraj 2026-12-16; retested by Cilla — PASS.
- No Sev1 or Sev2 defects.

---

## 6) Marcus Compliance Final Sign-Off

**Review date:** 2026-12-17
**Scope:** F-1.5-F-P1, F-1.5-F-P2, F-1.5-F-P3 (compliance-touching features)

Marcus reviewed:
- OVERDUE non-suppressibility confirmed in code via audit — ✅ CONFIRMED
- DOM-only threshold mutation authorization confirmed — ✅ CONFIRMED
- AD applicability filter DOM confirmation requirement confirmed — ✅ CONFIRMED
- FSDO audit export includes applicability filter log — ✅ CONFIRMED
- Digest mode emergency bypass confirmed — ✅ CONFIRMED

**Marcus Webb, Compliance Director — Sprint 4 compliance clearance: ✅ APPROVED 2026-12-17**

---

## 7) Jonas Release Gate

**Review date:** 2026-12-18
**Checklist:**

- [x] 365/365 TCs PASS (Sprint 4 new + full regression)
- [x] Zero Sev1/Sev2 open defects (DEF-37-01 Sev3 resolved + retested)
- [x] Marcus compliance clearance received (2026-12-17) — all three compliance-touching features approved
- [x] Staging deployment stable (3 days; no incidents, no errors above baseline)
- [x] Release notes drafted and reviewed
- [x] Wave plan confirmed (Wave 1: RMTS + WFAS + HPAC; Wave 2: all remaining shops)
- [x] Rollback procedure documented

**Jonas Harker, Release Gate: ✅ APPROVED — SHIP 2026-12-19**

---

## 8) Production Deployment

**Ship date:** 2026-12-19
**Release tag:** v1.5.0-sprint4

| Wave | Shops | Deploy time | Status |
|---|---|---|---|
| Wave 1 | RMTS, WFAS, HPAC | 2026-12-19T14:00 UTC | ✅ Deployed, no incidents |
| Wave 2 | HDMRO, DST, LSR, Ridgeline, Priya Sharma | 2026-12-19T16:00 UTC | ✅ Deployed, no incidents |

**Post-deploy monitoring (2026-12-19 to 2026-12-20):**
- Error rate: baseline (no elevated 5xx)
- Alert engine performance: p95 latency 212ms (within SLA)
- Digest jobs: first daily digest sent 2026-12-20T07:00 UTC — 3 shops with opted-in DOMs; all three confirmed receipt

---

## 9) UAT Confirmations

| Tester | Shop | Feature(s) | Date | Outcome |
|---|---|---|---|---|
| Dale Renfrow (DOM, RMTS) | Rocky Mountain Turbine Service | F-1.5-F-P3 (digest mode), F-1.5-G-P3 (template diff) | 2026-12-20 | ✅ APPROVED — "The digest is exactly what I asked for. I want the morning summary, not six texts during my day." |
| Paul Kaminski (DOM, WFAS) | Walker Field Aviation Services | F-1.5-F-P2 (applicability filter), F-1.5-G-P2 (coverage widget) | 2026-12-20 | ✅ APPROVED — "The coverage widget is going to make our protocol adoption meeting much easier." |
| Lorena Vásquez (DOM/IA, HPAC) | High Plains Aero & Charter | F-1.5-F-P1 (threshold tuning), F-1.5-G-P1 (onboarding flow) | 2026-12-21 | ✅ APPROVED — "If I'd had the onboarding checklist Day 1, the King Air validation would have taken half the time." |

---

## 10) Nadia PM Close-Out (2026-12-21)

> "Sprint 4 shipped clean. Alert-signal quality was the top request from DOM feedback for the last two phases — we delivered on all three P1 signal items with zero compliance regressions. Adoption UX features got positive UAT signals from all three testers. v1.5.0-sprint4 is the most operationally grounded release since v1.4.0. R-37-02 (alert-signal tuning risk) resolved — all three compliance-touching features cleared by Marcus. No carry-forward defects."

**WS37-B STATUS: ✅ DONE**
