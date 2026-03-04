# WS27-D — v1.3 Feature Planning + Backlog Lock
**Phase:** 27 (ACTIVE)
**Status:** ✅ COMPLETE — PASS
**Filed:** 2026-02-23T~05:30Z

**Owners:**
- Nadia Solis — Customer Success (v1.3 scope and customer impact)
- Marcus Webb — Compliance Architect (regulatory surface review)
- Devraj Anand — Engineering (implementation sequencing and effort sizing)
- Cilla Oduya — QA (test coverage planning)
- Jonas Harker — Infrastructure (release delivery planning)

---

## Table of Contents

1. [v1.3 Scope — What's In](#1-v13-scope)
2. [Feature Definitions](#2-feature-definitions)
3. [Sprint Sequencing](#3-sprint-sequencing)
4. [Capacity Assessment](#4-capacity-assessment)
5. [Team Sign-Offs](#5-team-sign-offs)
6. [Backlog Lock Statement](#6-backlog-lock-statement)

---

## 1. v1.3 Scope — What's In

v1.3 is the compliance surface release. It takes the data models and backend work from Phase 27 (Bell 206B-III ALS, S-76C Part 29 ALS, mandatory SI tracking) and ships them as production UI — usable by mechanics and DOMs without direct database access. It also ships two features that have been in the backlog since Phase 25: the mandatory SI dashboard and the FSDO audit export. And it carries forward OPEN-2C-01 (Repairman certificate employer-transition warning), which has been deferred through two planning cycles.

**v1.3 feature set — locked:**

| ID | Feature | Phase Origin | Closes |
|---|---|---|---|
| F-1.3-A | Bell 206B-III ALS Tracking UI | Phase 27 (WS27-A schema) | OC-26-02 production activation |
| F-1.3-B | S-76C Part 29 ALS Tracking UI | Phase 27 (WS27-B schema extension) | OC-26-03 production activation |
| F-1.3-C | Mandatory SI Dashboard | Phase 27 (WS27-A `siItems` schema) | OC-25-02 production activation |
| F-1.3-D | FSDO Audit Export | Phase 27 (WS27-C compliance posture; WS26-C flag resolution) | Phase 27 gate item |
| F-1.3-E | Repairman Certificate Employer-Transition Warning | Phase 25 (OPEN-2C-01) | OPEN-2C-01 |

**Out of scope for v1.3 (deferred to v1.4 or v2.0):**
- Multi-engine dual-authority engine compliance UI (informational display only in v1.3; full editor deferred)
- CMR dedicated table (`cmrItems`) — CMRs tracked via `alsItems` with `complianceCategory: "CMR"` in v1.3; dedicated table in v1.4
- Part 135 Lone Star Rotorcraft compliance (separate gate required; not authorized)
- Any new shop onboarding (Phase 28)
- Desktop-only print-formatted maintenance record output (separate design sprint required)

---

## 2. Feature Definitions

### 2.1 F-1.3-A — Bell 206B-III ALS Tracking UI

**What it is:**
A UI layer over the `alsItems` Convex backend (Phase 26, WS26-A) and `siItems` backend (Phase 27, WS27-A), scoped to Lone Star Rotorcraft's Bell 206B-III fleet (N411LS, N412LS, N413LS). The UI enables Sandra Okafor (or Tobias Ferreira) to:
- View the ALS compliance board for each Bell 206B-III aircraft
- Add ALS items for Bell-specific components (pre-filled templates for the 23 Bell 206B-III ALS items)
- Log compliance events (link ALS item closure to a signed work order)
- View the mandatory SI board (siItems dashboard) for Bell SIs
- Add Bell mandatory SIs (BHT-206B-SI-xxx) with applicability details

**Key UX decisions:**
- ALS board is sorted by urgency: OVERDUE → DUE_SOON → WITHIN_LIMIT (same as existing LLP dashboard pattern)
- Bell 206B-III pre-filled templates reduce data entry burden: when Sandra selects N411LS and clicks "Add ALS Item," the template list shows all 23 Bell ALS items with pre-populated part numbers, life limits, and interval types
- Mandatory SI board is a separate tab from the ALS board on the aircraft detail page — maintains the regulatory distinction Tobias emphasized (SI ≠ ALS)
- Bell SI template library: search by SI number or component keyword; reduces manual entry
- Dashboard renders correctly on iPad (Sandra and Tobias use iPads in the shop)

**Who uses it:** Sandra Okafor (DOM), Tobias Ferreira (A&P/IA), Marcus Webb (remote compliance review)

---

### 2.2 F-1.3-B — S-76C Part 29 ALS Tracking UI

**What it is:**
Extends F-1.3-A's ALS tracking UI for the Sikorsky S-76C (N76LS) with Part 29-specific display. Functionally similar to F-1.3-A, with these differences:

- **Part 29 badge:** ALS items for N76LS display a "Part 29" badge to distinguish them from Part 27 aircraft items in the same org dashboard
- **Dual-authority engine items:** ALS items with `dualAuthorityEngine: true` display an "Engine Authority: Turbomeca Arriel 2S1 ICA" inline note — the compliance authority is visible without the user having to know to look at the `dualAuthorityIcaRef` field
- **CMR item display:** Items with `complianceCategory: "CMR"` are grouped in a "Certification Maintenance Requirements" section within the ALS board. CMR items display the CMR reference and test description; urgency logic is the same as standard ALS items
- **Sikorsky mandatory SB board:** `siItems` with `siCategory: "SIKORSKY_SB"` appear in the mandatory SI board with a Sikorsky branding indicator
- **N76LS activation status:** N76LS compliance surface activation (previously DISABLED) is now ENABLED once v1.3 ships and the initial ALS data entry is complete

**Note on initial data entry:** The ALS items for N76LS (33 items from WS27-B Section 4) are not pre-loaded by v1.3. They will be entered in a dedicated Lone Star data entry session with Sandra and Marcus after v1.3 ships. F-1.3-B provides the UI to do that entry; it does not auto-populate N76LS's ALS board.

---

### 2.3 F-1.3-C — Mandatory SI Dashboard

**What it is:**
A fleet-level mandatory SI compliance board. The existing `getSiComplianceDashboard` (per-aircraft) and `getFleetSiAlerts` (org-wide NONCOMPLIANT query) backends from WS27-A power this view. The dashboard shows:

- **Fleet SI Alert Panel:** All aircraft in the org with NONCOMPLIANT mandatory SIs, grouped by aircraft. Red indicator. DOM-facing; always visible on DOM dashboard home.
- **Per-Aircraft SI Board:** On each aircraft detail page, the Mandatory SI tab shows all active siItems (OPEN and NONCOMPLIANT) with compliance window, action required, and a "Mark Compliant" button that initiates the closeSiItem workflow.
- **SI Compliance Workflow:** When a DOM or IA clicks "Mark Compliant" on a mandatory SI: (1) select the linked work order, (2) enter compliance date and hours, (3) add notes, (4) confirm. This calls `closeSiItem`. Requires `sign_rts` permission (IA or DOM).
- **Paper binder migration aid:** On first visit to the mandatory SI board for a Bell 206B-III aircraft, the UI shows a contextual banner: "Sandra's binder → Athelon. Start adding Bell SIs to replace your paper tracking." With a link to the Bell SI template library.

**Who uses it:** Sandra Okafor (DOM), Tobias Ferreira (IA), Marcus Webb (remote compliance review)

**Note on operational urgency:** This feature closes the gap that Tobias described in the WS27-A SME brief — the grip bolt scenario, where a mandatory SI for a flight-critical component has no system alert. Once F-1.3-C is live and Sandra has entered Lone Star's Bell SIs, that gap is closed.

---

### 2.4 F-1.3-D — FSDO Audit Export

**What it is:**
An export function that produces a print-formatted PDF package for an FSDO audit of a specific aircraft's compliance records. The export is designed around the lesson from WS27-C: when Frank needed to present documentation for the three Category 3 records, the documentation existed in Athelon but required manual assembly.

**Export contents (per aircraft):**
1. Aircraft identification summary (registration, make, model, S/N, certification basis)
2. ALS compliance board: all ALS items with current status, last compliance date/hours, next due
3. Mandatory SI board: all siItems with status, compliance evidence, open items
4. AD compliance summary: all adComplianceRecords with basis, notes, flag status
5. Open items summary: any OVERDUE/NONCOMPLIANT/DUE_SOON items highlighted
6. Signed work order index: all work orders with RTS signatures for the audit period

**Export scope options:**
- Single aircraft
- All aircraft in org
- Date range filter (for "audit period" exports)

**Format:** PDF, generated server-side via the existing PDF export infrastructure (Phase 16, WS16-C). New template for compliance audit format.

**Who uses it:** DOM (Frank Nguyen for DST; Sandra Okafor for Lone Star). Purpose: assemble FSDO audit package in seconds, not hours.

**Marcus's note on this feature:**

> "Frank spent several days assembling the documentation for Records 22, 23, 24. He's a thorough DOM — he did it right. But the assembly work shouldn't take days. If Athelon is doing its job, the compliance state is already organized in the system. F-1.3-D makes that state exportable on demand. The FSDO audit export is not a luxury feature. It's the product delivering on its core promise: you don't need to dig through filing cabinets when the FAA shows up."

---

### 2.5 F-1.3-E — Repairman Certificate Employer-Transition Warning

**What it is:**
Addresses OPEN-2C-01 — an open backlog item from Phase 22 (first flagged in Phase 21 onboarding of High Desert MRO).

**Background:**
A Repairman Certificate (14 CFR Part 65 Subpart E) issued under §65.101(a)(1) is issued to a specific individual employed at a specific certificated repair station. Unlike an A&P certificate (which is a personal license), a Repairman certificate is tied to the holder's employment at the issuing organization. If a Repairman certificate holder changes employers, their certificate is no longer valid at the new employer — a new certificate application is required.

This is a compliance gap that Athelon's existing qualification alerts (Phase 15, WS15-J) do not handle: the system knows the certificate exists and its expiry date, but it does not know when the certificate holder changes employers and cannot warn that the certificate may no longer be valid.

**The warning:**
When an Athelon admin user terminates a user's employment at an org (or when a user with `certificate_type: "REPAIRMAN"` is transferred between orgs), Athelon displays a warning:

> "⚠️ Employer Transition — Repairman Certificate Validation Required
>
> [User] holds a Repairman Certificate [cert number]. Under 14 CFR §65.101(a)(1), a Repairman Certificate issued for a specific employer is valid only while the holder is employed at the issuing organization. If this user is changing employers, their current Repairman Certificate is not valid for work performed at the new organization. A new Repairman Certificate application (FAA Form 8610-2) may be required.
>
> Action: Verify certificate validity with the new employer's DOM before assigning maintenance work to this user. [Mark as Reviewed]"

**Who sees it:** DOM, Admin users. Not shown to the certificate holder directly (avoids creating the impression Athelon is giving regulatory advice to the individual).

**Implementation scope:**
- Trigger: user offboarding at an org, or `employerOrgId` change for a user with `certificates` containing `type: "REPAIRMAN"`
- Display: warning modal during org transition workflow + persistent banner in the user's qualification record
- Resolution: DOM marks "Reviewed" (logged with timestamp and DOM user ID)
- Cilla test cases: TC-OPEN-2C-01-001 through TC-OPEN-2C-01-003 (warning displays, warning can be dismissed, warning is org-isolated)

---

## 3. Sprint Sequencing

### 3.1 v1.3 Sprints Overview

v1.3 is three sprints. Critical path: F-1.3-A and F-1.3-C share the same backend (Bell ALS + siItems), so they run in the same sprint. F-1.3-B extends F-1.3-A and runs in Sprint 2 once the Bell UI patterns are established. F-1.3-D (FSDO export) is the most technically isolated feature and can run in parallel with either sprint. F-1.3-E (Repairman warning) is small and runs in Sprint 3 alongside final integration.

```
Sprint 1 (2 weeks):
  F-1.3-A: Bell 206B-III ALS Tracking UI (Chloe + Finn)
  F-1.3-C: Mandatory SI Dashboard (Chloe + Devraj)
  Backend: siItems + alsItems Part 27 data entry UI (Devraj)
  QA: TC-1.3-A and TC-1.3-C test suites (Cilla)

Sprint 2 (2 weeks):
  F-1.3-B: S-76C Part 29 ALS Tracking UI — extends F-1.3-A (Chloe + Finn)
  F-1.3-D: FSDO Audit Export — new PDF template (Devraj + Jonas)
  Backend: Part 29 extension fields in alsItems UI (Devraj)
  QA: TC-1.3-B and TC-1.3-D test suites (Cilla)

Sprint 3 (1 week):
  F-1.3-E: Repairman Certificate Employer-Transition Warning (Devraj + Chloe)
  Integration testing: full v1.3 feature set, cross-feature seams (Cilla)
  Marcus compliance clearance: final sign-off on all regulatory surfaces
  Release readiness: Jonas (infrastructure), Nadia (customer communication)
  UAT: Sandra Okafor (Bell ALS UI, mandatory SI dashboard), Frank Nguyen (FSDO export)
```

**Total: 5 weeks from sprint kick-off to release candidate.**

---

### 3.2 Sprint 1 — Detail

| Task | Owner | Est. Days | Dependencies |
|---|---|---|---|
| Bell 206B-III ALS board component (aircraft detail page) | Chloe + Finn | 4 | WS27-A schema |
| Bell 206B-III ALS item add/edit form with template library | Chloe + Devraj | 3 | alsItems schema |
| Mandatory SI board component (aircraft detail page) | Chloe + Finn | 3 | siItems schema |
| Fleet SI alert panel (DOM dashboard home) | Chloe | 2 | siItems + domAlerts |
| SI compliance workflow (Mark Compliant modal) | Devraj | 2 | closeSiItem mutation |
| Bell SI template library (search by SI# or component) | Devraj | 2 | siItems schema |
| Paper binder migration banner | Chloe | 1 | - |
| TC-1.3-A: Bell ALS UI test cases (Cilla) | Cilla | 2 | Sprint 1 features |
| TC-1.3-C: Mandatory SI dashboard test cases (Cilla) | Cilla | 2 | Sprint 1 features |

---

### 3.3 Sprint 2 — Detail

| Task | Owner | Est. Days | Dependencies |
|---|---|---|---|
| Part 29 badge + CMR section in ALS board | Chloe + Finn | 2 | F-1.3-A (ALS board component) |
| Dual-authority engine inline note display | Chloe | 1 | `dualAuthorityEngine` field |
| Sikorsky mandatory SB board extension | Devraj | 1 | `SIKORSKY_SB` siCategory |
| N76LS compliance surface activation flag | Devraj | 0.5 | WS27-B audit pass |
| FSDO audit export — compliance audit PDF template | Devraj | 4 | PDF infra (WS16-C) |
| FSDO export — scope options (single/org/date range) | Devraj | 2 | Export backend |
| FSDO export — UI trigger on aircraft detail + org settings | Chloe | 1 | Export backend |
| TC-1.3-B: S-76C ALS UI test cases (Cilla) | Cilla | 2 | Sprint 2 features |
| TC-1.3-D: FSDO export test cases (Cilla) | Cilla | 2 | Sprint 2 features |

---

### 3.4 Sprint 3 — Detail

| Task | Owner | Est. Days | Dependencies |
|---|---|---|---|
| Repairman certificate employer-transition warning trigger | Devraj | 1 | User offboarding flow |
| Repairman warning modal + persistent banner | Chloe | 1 | Trigger implementation |
| Repairman warning DOM "Mark as Reviewed" | Devraj | 0.5 | - |
| TC-1.3-E: Repairman warning test cases (Cilla) | Cilla | 1 | Sprint 3 features |
| Integration test: full v1.3 feature set | Cilla | 3 | All sprint features |
| Marcus compliance clearance: F-1.3-A through F-1.3-E | Marcus | 2 | All sprints |
| UAT: Sandra Okafor (Bell ALS UI, SI dashboard) | Sandra + Nadia | 2 | Sprint 1 features |
| UAT: Frank Nguyen (FSDO export) | Frank + Nadia | 1 | Sprint 2 features |
| Release readiness + deployment plan | Jonas | 2 | Cilla integration pass |
| Customer communication: v1.3 release notes (all shops) | Nadia | 1 | Release readiness |

---

### 3.5 v1.3 Release Criteria

1. F-1.3-A through F-1.3-E all built and passing Cilla's test suites
2. Marcus compliance clearance on all regulatory surfaces (F-1.3-A, B, C, D — all compliance-touching)
3. Sandra Okafor UAT sign-off on Bell ALS UI and SI dashboard
4. Frank Nguyen UAT sign-off on FSDO audit export
5. Zero FAIL items in Cilla's integration test run
6. Jonas release readiness PASS
7. Nadia customer communication drafted

---

## 4. Capacity Assessment

### 4.1 Team Availability for v1.3 Sprints

| Team Member | Role | Sprint 1 | Sprint 2 | Sprint 3 | Notes |
|---|---|---|---|---|---|
| Devraj Anand | Engineering | ✅ Full | ✅ Full | ✅ Full | No blocking dependencies post-Phase 27 |
| Chloe Park | Frontend | ✅ Full | ✅ Full | ✅ Full | — |
| Finn Calloway | Frontend | ✅ Full | ✅ Full | ⬜ 50% | Finn has pre-existing Phase 28 scoping commitment Sprint 3 |
| Jonas Harker | Infrastructure | ⬜ 50% | ✅ Full | ✅ Full | Sprint 1: monitoring Phase 27 infrastructure |
| Cilla Oduya | QA | ✅ Full | ✅ Full | ✅ Full | QA capacity confirmed |
| Marcus Webb | Compliance | ⬜ 30% | ⬜ 30% | ✅ Full | Sprint 1-2: DST follow-up (WO-DST-FPI-001 monitoring) |
| Nadia Solis | Product/CS | ⬜ 50% | ⬜ 50% | ✅ Full | Sprint 1-2: Phase 28 pre-scoping |

**Finn Sprint 3 at 50%:** Chloe carries the Repairman warning UI (small scope). No impact on timeline.
**Marcus Sprint 1-2 at 30%:** Marcus's compliance review role in Sprint 1-2 is limited to async review of spec changes; his full clearance pass is Sprint 3. This is acceptable given that the backend schemas are already Marcus-reviewed (WS27-A, WS27-B).

### 4.2 Timeline Projection

- Sprint 1 kick-off: Phase 27 gate review + 1 week (~2026-03-02)
- Sprint 1 complete: ~2026-03-15
- Sprint 2 complete: ~2026-03-29
- Sprint 3 + release readiness: ~2026-04-05
- **v1.3 target release: ~2026-04-07**

---

## 5. Team Sign-Offs

### Nadia Solis — Customer Success

v1.3 scope is the right scope. The Bell ALS UI and mandatory SI dashboard are what Sandra asked for when she showed us the binder. The FSDO audit export is what Frank needed when he was assembling the Category 3 package. The Repairman warning clears OPEN-2C-01, which has been in the backlog through two planning cycles.

I'm satisfied with the sprint sequencing. Sprint 3 UAT with Sandra and Frank is non-negotiable — these are the customers who live with these features, and they should see them before release.

**Nadia Solis sign-off: ✅ APPROVED**
*Lone Star + DST customer impact confirmed. Sprint 3 UAT planned.*

---

### Marcus Webb — Compliance

All five features in v1.3 have valid regulatory grounding:

- F-1.3-A/B: ALS tracking UI for Part 27 and Part 29 — the data models are correct (WS27-A, WS27-B). The UI must faithfully represent the compliance state without introducing interpretation.
- F-1.3-C: Mandatory SI dashboard — `siItems` backend is correct. The UI must maintain the regulatory distinction between SIs and ALS items that Tobias documented.
- F-1.3-D: FSDO audit export — the export must include all ALS, SI, and AD compliance records without omitting open items. No cherry-picking. I'll review the template in Sprint 2.
- F-1.3-E: Repairman warning — legally correct as specified. The warning is advisory, not prescriptive. It directs the DOM to verify; it does not make the determination itself.

One item I'm adding to Marcus's Sprint 3 review: the FSDO audit export must include a PDF header noting the export date, the system name, and a statement that the data reflects system records as of the export date. FSDO auditors need to know when the export was generated.

**Marcus Webb sign-off: ✅ APPROVED — with Sprint 3 FSDO export template review requirement noted.**

---

### Devraj Anand — Engineering

Backend schemas for all v1.3 features are complete (Phase 27 workstreams). Sprint 1 and 2 are frontend-heavy — Chloe and Finn carry the bulk. My work is primarily the FSDO export PDF template, the SI compliance workflow backend hooks, and the Repairman warning trigger logic.

I want to flag: the FSDO export is the most time-intensive engineering task in v1.3. The PDF template for compliance audit format is a new template type — different structure from the maintenance record PDF (Phase 16, WS16-C). I've estimated 4 days; if compliance template review with Marcus runs long, Sprint 2 is where schedule pressure could emerge. Jonas is on standby for infrastructure support in Sprint 2 if needed.

**Devraj Anand sign-off: ✅ APPROVED — FSDO export schedule risk flagged; Jonas standby for Sprint 2.**

---

### Cilla Oduya — QA

I've reviewed the feature definitions and have test plan outlines for TC-1.3-A through TC-1.3-E. Key compliance-critical test cases I'm prioritizing:

- **TC-1.3-C-01:** Fleet SI alert correctly shows NONCOMPLIANT items; does not show CLOSED items. (Regression risk: if someone modifies the `getFleetSiAlerts` query to include CLOSED items, the DOM dashboard gets noisy and operators start ignoring the alert panel — the pattern that got DST in trouble with the Category 3 records in the first place.)
- **TC-1.3-D-01:** FSDO export includes ALL open/noncompliant items. I will run a test where an aircraft has a deliberately NONCOMPLIANT item that is not obviously visible in the UI, and verify the export includes it. This is the essential check — the export cannot filter out bad news.
- **TC-1.3-E-02:** Repairman warning is visible to DOM but not to the Repairman certificate holder themselves. Role isolation on the warning display.

I'll need the Sprint 1 features to be in staging by end of week 2 of Sprint 1 for TC-1.3-A and TC-1.3-C execution. Chloe and Devraj know the drill.

**Cilla Oduya sign-off: ✅ APPROVED — TC-1.3-D-01 (FSDO export open items completeness) flagged as highest-priority compliance test.**

---

### Jonas Harker — Infrastructure

Infrastructure for v1.3 is well-positioned. The PDF export infrastructure (WS16-C) is in production and stable. The `siItems` backend alert scheduler is using the same pattern as `alsItems` alerts — no new infrastructure work for F-1.3-C.

One new infrastructure item: the FSDO audit export may generate large PDFs for orgs with many aircraft and years of records. I'll add a background job queue for export generation rather than a synchronous HTTP response — same pattern as the maintenance record PDF export. Users get a "Preparing export..." state, then a download notification. This is a 1-day infrastructure task in Sprint 2.

**Jonas Harker sign-off: ✅ APPROVED — background export queue noted for Sprint 2.**

---

## 6. Backlog Lock Statement

The v1.3 feature backlog is **LOCKED** as of this document.

**Locked features:**
- F-1.3-A: Bell 206B-III ALS Tracking UI
- F-1.3-B: S-76C Part 29 ALS Tracking UI
- F-1.3-C: Mandatory SI Dashboard
- F-1.3-D: FSDO Audit Export
- F-1.3-E: Repairman Certificate Employer-Transition Warning (OPEN-2C-01)

**Locked-out features (require Phase 28+ gate):**
- Dedicated CMR table (`cmrItems`)
- Multi-engine dual-authority editor
- Part 135 compliance surface for Lone Star
- Repetitive AD interval tracking enhancement (flagged by Marcus in WS27-C §6.2 — v1.4 candidate)
- Any Phase 28 features

**No additions to v1.3 without explicit reopening of this lock by Nadia + Marcus.**

**Lock approved by all five signatories (see Section 5).**

---

*WS27-D filed: 2026-02-23*
*v1.3 backlog: LOCKED*
*Target release: ~2026-04-07*
*Signatories: Nadia Solis (Customer Success), Marcus Webb (Compliance), Devraj Anand (Engineering), Cilla Oduya (QA), Jonas Harker (Infrastructure)*
