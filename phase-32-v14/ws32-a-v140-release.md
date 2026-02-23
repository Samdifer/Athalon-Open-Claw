# WS32-A — v1.4.0 Integration Testing + Release
**Version:** v1.4.0
**Release Date:** 2026-06-20
**Status:** ✅ DONE
**Test Lead:** Cilla Oduya
**Compliance Review:** Marcus Webb
**Release Gate:** Jonas Harker

---

## §1. Overview

v1.4.0 is the production release that closes the v1.4 development arc. Across Phases 29–31, six features were designed, built, and incrementally tested:

- **F-1.4-A** — Repetitive AD Interval Tracking (shipped v1.4.1-sprint1, 2026-03-28)
- **F-1.4-B** — Shop-Level ALS Compliance Dashboard (shipped v1.4.2-sprint2, 2026-05-07)
- **F-1.4-C** — Turbine-Type ALS Template Library (shipped v1.4.2-sprint2, bundled with F-1.4-B)
- **F-1.4-D** — Part 145 Certificate Number Field (shipped v1.4.2-sprint2, bundled with Ridgeline prep)
- **F-1.4-E** — Procurement Lead Time Awareness (shipped v1.4.3-sprint3, 2026-06-10)
- **F-1.4-F** — Maintenance Event Clustering (shipped v1.4.3-sprint3, 2026-06-10)

v1.4.0 is the integrated release of all six features, tested together as a coherent system. Individual sprint releases were canary tests on smaller shop populations; v1.4.0 is the all-shops production rollout.

---

## §2. Integration Test Suite — TC Matrix

**Test lead:** Cilla Oduya
**Test dates:** 2026-06-18 through 2026-06-19
**Test environment:** Staging (mirrors production schema; seeded with synthetic data for all 7 shops)
**Regression baseline:** Sprint releases v1.4.1, v1.4.2, v1.4.3 passing test artifacts

### §2.1 TC Matrix

| Feature | TC Count | P1 Defects | P2 Defects | Result |
|---|---|---|---|---|
| F-1.4-A Repetitive AD Interval Tracking | 34 | 0 | 0 | ✅ PASS |
| F-1.4-B Shop-Level ALS Compliance Dashboard | 22 | 0 | 0 | ✅ PASS |
| F-1.4-C Turbine-Type ALS Template Library | 14 | 0 | 1* | ✅ PASS |
| F-1.4-D Part 145 Certificate Number Field | 8 | 0 | 0 | ✅ PASS |
| F-1.4-E Procurement Lead Time Awareness | 12 | 0 | 0 | ✅ PASS |
| F-1.4-F Maintenance Event Clustering | 13 | 0 | 0 | ✅ PASS |
| Cross-feature integration (ALS + Procurement interaction) | 9 | 0 | 0 | ✅ PASS |
| Cross-feature integration (Dashboard + Clustering) | 7 | 0 | 0 | ✅ PASS |
| Multi-shop data isolation (7-org synthetic data run) | 18 | 0 | 0 | ✅ PASS |
| Migration regression (existing work orders, existing ALS records) | 11 | 0 | 0 | ✅ PASS |
| **TOTAL** | **148** | **0** | **1*** | **✅ PASS** |

*P2 defect: F-1.4-C — TBM 850 PT6A-66D LLP template sort order for CMR items displays in entry order rather than remaining-life order in the DOM view. UI cosmetic only; functional behavior correct; no compliance impact. Logged as v1.4.1-hotfix candidate. Not blocking for v1.4.0 release.

### §2.2 Cross-Feature Integration Highlights

**ALS + Procurement (F-1.4-A × F-1.4-E):**
When a repetitive AD compliance event is predicted to drive a parts requirement within the procurement lead time window, the system now generates a combined alert: "AD [X] due in [N] cycles/hours — procure [P/N] by [date] based on [lead time] lead." This was not tested in isolation during Sprint 1 or Sprint 3; the integration test confirmed the alert fires correctly when both features are active simultaneously. TC matrix: 9/9 PASS.

**ALS Dashboard + Event Clustering (F-1.4-B × F-1.4-F):**
When the Shop ALS Compliance Dashboard displays a DUE_SOON cluster (multiple aircraft with approaching limits in the same period), the clustering engine now surfaces the "schedule together" recommendation inline in the dashboard row — without requiring the DOM to navigate to a separate clustering view. 7/7 PASS.

**Multi-shop data isolation:**
Synthetic data representing all 7 shops (7 org IDs, 32 aircraft, 487 ALS items) was loaded in staging. Each shop was accessed with shop-scoped credentials. Zero cross-org data leakage detected. All ALS boards, all dashboards, all procurement alerts showed only same-org data. 18/18 PASS.

### §2.3 Cilla Oduya Test Sign-Off

> **CILLA ODUYA — QA SIGN-OFF**
> Date: 2026-06-19
> Version: v1.4.0
>
> Full regression suite executed across 148 test cases covering all six v1.4 features, all cross-feature integration surfaces, multi-shop data isolation, and migration regression.
>
> **Result: 148/148 PASS. Zero P1 defects. One P2 defect (cosmetic, non-blocking, logged for hotfix).**
>
> v1.4.0 test suite is clean. I am authorizing the release gate.
>
> — Cilla Oduya, QA Lead, Athelon

---

## §3. Marcus Webb — Compliance Final Review

**Review date:** 2026-06-19
**Scope:** All regulatory-touching v1.4 features; ALS template accuracy; repetitive AD state machine compliance alignment

### §3.1 Regulatory Analysis by Feature

**F-1.4-A — Repetitive AD Interval Tracking:**
The repetitive AD interval state machine (COMPLIANT / REPETITIVE_APPROACHING / NONCOMPLIANT) and its alert thresholds (AMBER at 15% remaining; RED at 5% remaining or past due) were reviewed for alignment with:
- 14 CFR §39.3 (AD applicability)
- 14 CFR §39.7 (failure to comply)
- 14 CFR §39.11 (conditions and limitations)
- AC 39-7D (Airworthiness Directives Compliance)

The interval carry-forward logic (last compliance + specified interval = next due) matches the text of every applicable repetitive AD reviewed. The state machine boundary conditions (exact cycle = COMPLIANT; one cycle over = NONCOMPLIANT) are aggressive but legally correct — there is no grace period in a compliance AD. **No compliance finding.**

**F-1.4-B — Shop-Level ALS Compliance Dashboard:**
The dashboard's display priority logic (OVERDUE > DUE_SOON > COMPLIANT) and its "days to limit" calculation (remaining hours ÷ average daily utilization from last 90 days of work orders) were reviewed. Utilization estimates are clearly labeled as *estimates* and the display shows the underlying remaining hours directly — the estimate does not substitute for the actual counter. **No compliance finding.**

**F-1.4-C — Turbine-Type ALS Template Library:**
Templates reviewed for accuracy against source documents:
- Cessna 208B: Cessna Service Bulletin SEB08-7 / Cessna Maintenance Manual D2101-13, §5-10. All 29 items verified. ✅
- PT6A-114A: P&WC PT6A-114A Engine Maintenance Manual PWEC Document 3002397, §05-10. All 11 engine LLP/CMR items verified. ✅
- PT6A-66D: P&WC PT6A-66D Engine Maintenance Manual PWEC Document 3021843, §05-10. All 7 LLP items + 4 CMR items verified. ✅ (Template was co-built with Curtis Pallant in WS31-A.)
- Robinson R44: R44 Maintenance Manual §04. All 22 items verified. ✅
- Bell 206B-III: Bell Helicopter Textron Maintenance Manual BHT-206B-MM, §05-10. All 31 items verified. ✅
- Sikorsky S-76C: Sikorsky Aircraft S-76 Maintenance Manual SA4047-76-1, §05-10, Part 29 basis. All 44 items verified. ✅

**No compliance finding on any template.** P2 cosmetic defect (sort order) has zero regulatory impact.

**F-1.4-D — Part 145 Certificate Number Field:**
Certificate number is an org-level configuration field that populates on maintenance release documentation per 14 CFR §145.217(a)(1) requirements for repair station certificate number disclosure on work performed documents. **No compliance finding.**

**F-1.4-E — Procurement Lead Time Awareness:**
Procurement lead time feature is an advisory/operational aid. It does not alter the legal status of any ALS counter, AD compliance date, or maintenance release. It creates scheduled procurement tasks that are non-binding recommendations. **No compliance finding; no regulatory concern.**

**F-1.4-F — Maintenance Event Clustering:**
Event clustering recommendation engine groups upcoming ALS events by aircraft-compatible proximity to reduce unnecessary hangar downtime. Clustering is advisory; it does not rearrange ALS limits or defer compliance. The UI explicitly states that clusters are operational suggestions and that ALS limits remain inviolable regardless of schedule. **No compliance finding.**

### §3.2 Marcus Webb Compliance Sign-Off

> **MARCUS WEBB — COMPLIANCE FINAL SIGN-OFF**
> Date: 2026-06-19
> Version: v1.4.0
>
> I have reviewed all six v1.4 features against applicable regulations and source documents. I have reviewed the ALS template library against source ICAs and maintenance manuals for all six aircraft types supported. I have reviewed the state machine boundary conditions, alert thresholds, dashboard display logic, and migration approach for existing ALS records.
>
> **No compliance-blocking findings.** One P2 defect (cosmetic, non-compliance-affecting) noted and logged for hotfix.
>
> v1.4.0 is cleared for production release from a compliance standpoint.
>
> Regulatory references supporting this sign-off: 14 CFR Part 39 (AD compliance), 14 CFR Part 43 (maintenance requirements), 14 CFR Part 91 (operating limitations, ALS requirements), 14 CFR Part 145 (repair station certificate requirements), AC 39-7D, AC 43.13-1B, FAA Order 8900.1.
>
> — Marcus Webb, Director of Compliance, Athelon

---

## §4. UAT Smoke Test — DOM Contacts

### §4.1 Dale Renfrow — RMTS (DOM, Grand Junction CO)

**UAT session date:** 2026-06-20 (day of release; UAT conducted on release build)
**Session duration:** 35 minutes (combined with WS32-C 30-day check-in call)
**Features exercised:**
- Shop ALS Compliance Dashboard (F-1.4-B): Viewed N416AB board in the dashboard; confirmed all 29 ALS items display; DUE_SOON badges visible for two items; COMPLIANT items filtered correctly
- Procurement Lead Time Awareness (F-1.4-E): Confirmed a scheduled procurement alert is visible for the N416AB replacement fuel selector valve order-ahead window (the replacement valve installed in WS31-B; but the system correctly shows the *new* valve's next upcoming procurement window at ~10,800 cycles forward)
- Repetitive AD Tracking (F-1.4-A): Confirmed AD 2020-18-06 interval state shows COMPLIANT with next due displayed correctly

**Dale Renfrow UAT confirmation:**
> "Everything I looked at worked. The dashboard is fast — I'm seeing all my aircraft, all their statuses, without clicking into each one. The procurement alert for the valve — that's exactly what I wanted when we talked about this feature in May. I asked for 'tell me before it's a problem.' This tells me before it's a problem."
>
> ✅ **UAT APPROVED** — Dale Renfrow, DOM, Rocky Mountain Turbine Service, 2026-06-20

### §4.2 Sandra Okafor — Lone Star Rotorcraft (DOM, Fort Worth TX)

**UAT session date:** 2026-06-20
**Session duration:** 28 minutes (video call; Tobias Ferreira also present)
**Features exercised:**
- Maintenance Event Clustering (F-1.4-F): Sandra reviewed the N76LS post-June-event ALS board; the clustering engine had already captured the June combined event (WO-LSR-ALS-001/002/003) as a completed cluster. She tested the *next* cluster window — three items on N76LS coming due within an 18-month window — and confirmed the clustering recommendation surfaced correctly in the dashboard.
- Shop ALS Compliance Dashboard (F-1.4-B): Browsed the full LSR dashboard; confirmed Bell 206B-III (N76LS) board is live and correct post-June event. All three replaced items show counters reset to 0.
- Repetitive AD Tracking (F-1.4-A): Confirmed DST N9944P scenario visible from the cross-shop simulation (Sandra is aware of this feature from UAT29).

**Sandra Okafor UAT confirmation:**
> "The cluster recommendation for the next N76LS window — it showed me three items that I wasn't planning together. I was going to do them one at a time. Looking at it now, doing them together saves me two hangar entries. That's real. That feature paid for itself in the first five minutes."
>
> ✅ **UAT APPROVED** — Sandra Okafor, DOM, Lone Star Rotorcraft, 2026-06-20

---

## §5. Jonas Harker — Release Gate Checklist

**Release date:** 2026-06-20
**Deployment target:** All 7 shops (production)

### §5.1 Pre-Release Checklist

| Item | Status | Notes |
|---|---|---|
| Cilla test sign-off received | ✅ | 148/148 PASS, 2026-06-19 |
| Marcus compliance sign-off received | ✅ | All features cleared, 2026-06-19 |
| UAT confirmation from ≥2 DOM contacts | ✅ | Dale Renfrow + Sandra Okafor, 2026-06-20 |
| Staging deployment validated | ✅ | Staging mirrors production schema; 7-shop synthetic data run PASS |
| Database migration scripts tested | ✅ | Migration adds v1.4 schema fields to existing ALS records; backward-compatible; no record deletion |
| Convex deployment preview confirmed | ✅ | All new mutations/queries deployed to preview environment; no schema conflicts |
| Rollback plan documented | ✅ | See §5.3 |
| Feature flags all active for v1.4 | ✅ | F_1_4_A through F_1_4_F flags set to ENABLED in production config |
| Per-shop rollout order confirmed | ✅ | See §5.2 |
| Monitoring alerts configured | ✅ | Convex error rate + ALS mutation success rate + dashboard query latency monitored; PagerDuty thresholds set |
| v1.4.0 release notes drafted | ✅ | Filed in `/releases/v1.4.0-release-notes.md` |

### §5.2 All-Shops Rollout Plan

Rollout executed in two waves. Wave 1 runs at 09:00 MT 2026-06-20; Wave 2 runs at 12:00 MT 2026-06-20 (no downtime; all deployments are zero-downtime Convex function updates).

**Wave 1 (09:00 MT):**
| # | Shop | DOM | Location | Notes |
|---|---|---|---|---|
| 1 | Rocky Mountain Turbine Service | Dale Renfrow | Grand Junction CO | Turbine-only shop; highest ALS feature utilization; early adopter of F-1.4-A and F-1.4-B |
| 2 | Ridgeline Air Maintenance | Curtis Pallant | Reno-Stead NV | Most recently onboarded; highest compliance urgency due to WS32-B activity |
| 3 | Lone Star Rotorcraft | Sandra Okafor | Fort Worth TX | Active ALS cluster pending (N76LS); F-1.4-F high-value |

**Wave 2 (12:00 MT):**
| # | Shop | DOM | Location | Notes |
|---|---|---|---|---|
| 4 | Carla Ostrowski's shop | Carla Ostrowski | Columbus OH | First shop; stable base |
| 5 | High Desert MRO | Bill Reardon | Prescott AZ | Twin shop; LLP dashboard primary use case |
| 6 | Priya Sharma's Part 135 operation | Priya Sharma | Phoenix area AZ | Part 135 focused; ALS features secondary |
| 7 | Desert Sky Turbine | Frank Nguyen | Scottsdale AZ | Turbine shop; F-1.4-B high-value |

### §5.3 Data Migration Steps

v1.4.0 includes two schema additions for existing records:

1. **`alsItems.procurementLeadTimeDays` field (F-1.4-E):** New optional field on every ALS item. Default: `null` (no lead time configured). Shops can populate via DOM settings. Migration: add field with null default, no existing record modified.

2. **`maintenanceEvents.clusterGroupId` field (F-1.4-F):** New optional field on work orders. Default: `null` (unclustered). Clustering engine populates this forward-only. Migration: add field with null default to all existing work orders.

3. **`organizations.part145CertNumber` field (F-1.4-D):** Already shipped in v1.4.2-sprint2; no migration needed for v1.4.0.

**Migration script:** `db/migrations/v1.4.0-schema-extension.ts` — additive only; no destructive operations; idempotent.

### §5.4 Rollback Plan

v1.4.0 features are deployed behind feature flags. Rollback procedure:
1. Set all `F_1_4_*` feature flags to `DISABLED` in Convex environment config
2. Feature surfaces revert to v1.3 state immediately (no redeploy required)
3. Migration schema fields are backward-compatible; no data is lost
4. If schema rollback required: run `db/migrations/v1.4.0-rollback.ts` (removes new fields only, preserves all existing ALS data)

### §5.5 Jonas Harker Release Gate Sign-Off

> **JONAS HARKER — RELEASE GATE**
> Date: 2026-06-20
> Version: v1.4.0
>
> All pre-release checklist items verified. Both deployment waves completed without incident. All 7 shops confirmed active on v1.4.0 (Convex dashboard: all orgs showing v1.4 function versions deployed).
>
> No rollback required. No alerts fired during rollout window. Error rate nominal (<0.1%).
>
> **v1.4.0 is live. All 7 shops deployed.**
>
> — Jonas Harker, Release Lead, Athelon, 2026-06-20

---

## §6. v1.4.0 Shop Confirmation Summary

| Shop | DOM | v1.4.0 Active | Key Features Live |
|---|---|---|---|
| Carla Ostrowski's shop (Columbus OH) | Carla Ostrowski | ✅ 2026-06-20 | F-1.4-B dashboard; F-1.4-A AD tracking |
| High Desert MRO (Prescott AZ) | Bill Reardon | ✅ 2026-06-20 | F-1.4-B dashboard; F-1.4-E procurement |
| Priya Sharma's Part 135 (Phoenix area) | Priya Sharma | ✅ 2026-06-20 | F-1.4-A AD tracking; F-1.4-B dashboard |
| Desert Sky Turbine (Scottsdale AZ) | Frank Nguyen | ✅ 2026-06-20 | F-1.4-B dashboard; F-1.4-C templates; F-1.4-E |
| Lone Star Rotorcraft (Fort Worth TX) | Sandra Okafor | ✅ 2026-06-20 | F-1.4-F clustering; F-1.4-B dashboard; F-1.4-A |
| Rocky Mountain Turbine Service (Grand Junction CO) | Dale Renfrow | ✅ 2026-06-20 | All F-1.4 features active; turbine-first shop |
| Ridgeline Air Maintenance (Reno-Stead NV) | Curtis Pallant | ✅ 2026-06-20 | F-1.4-C PT6A templates; F-1.4-B dashboard; F-1.4-E |

---

## §7. v1.4 Development Arc — Closure Summary

| Version | Date | Features | Test Status |
|---|---|---|---|
| v1.4.1-sprint1 | 2026-03-28 | F-1.4-A Repetitive AD Interval Tracking | 62/62 PASS |
| v1.4.2-sprint2 | 2026-05-07 | F-1.4-B ALS Dashboard + F-1.4-C Template Library + F-1.4-D Part 145 Cert Field | 18/18 PASS |
| v1.4.3-sprint3 | 2026-06-10 | F-1.4-E Procurement Lead Time + F-1.4-F Event Clustering | 25/25 PASS |
| **v1.4.0** | **2026-06-20** | **Full integration — all six features** | **148/148 PASS** |

The v1.4 development arc is closed. v1.4.0 is the current production version for all seven shops.

---

*WS32-A complete. v1.4.0 shipped 2026-06-20. All 7 shops confirmed. Cilla ✅ APPROVED. Marcus ✅ APPROVED. Jonas release gate ✅. Dale Renfrow + Sandra Okafor UAT ✅.*
