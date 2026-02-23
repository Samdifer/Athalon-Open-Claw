# WS37-C — KGJT Dual-Shop Operating Cadence Review (RMTS + WFAS)
**Phase:** 37
**Status:** ✅ DONE
**Review date:** 2026-12-10 through 2026-12-12
**Owners:** Nadia Solis (Athelon PM) · Dale Renfrow (DOM, Rocky Mountain Turbine Service) · Paul Kaminski (DOM, Walker Field Aviation Services)
**Scope:** Rocky Mountain Turbine Service (RMTS) + Walker Field Aviation Services (WFAS) — both based KGJT, Grand Junction Regional Airport, CO
**Review type:** Structured dual-shop cadence review — protocol adoption, compliance evidence quality, coordination patterns

---

## 1) Background and Context

KGJT now hosts two Athelon shops operating on the same ramp. This is the first time in the network that two independent Part 145 operators share both an airport and a platform vendor. The pairing carries opportunity (peer coaching, shared protocol library familiarity, coordinated scheduling) and risk (evidence isolation, competitive sensitivity, protocol version drift between shops).

**Rocky Mountain Turbine Service (RMTS):**
- DOM: Dale Renfrow
- Certificate: Part 145 CO-4491
- Fleet served: turbine-heavy (PT6A-114A Caravans, piston singles)
- Athelon tenure: ~9 months (onboarded Phase 29)
- Protocol adoption status: PROTO-RMTS-001 (PT6A-114A combustion liner borescope) — source material for the Athelon PT6A-114A base template; 3 additional protocols adopted

**Walker Field Aviation Services (WFAS):**
- DOM: Paul Kaminski
- Certificate: Part 145 CO-7721
- Fleet served: PT6A-114A Caravans (N416TE, N7822K) + piston singles (C172S ×4, PA-28-181, PA-32-301FT)
- Athelon tenure: ~7 weeks at Phase 37 start (onboarded Phase 35)
- Protocol adoption status: PROTO-WFAS-001 (derived from PT6A-114A base template) — first adopted template; 1 additional protocol

---

## 2) Review Structure

Nadia conducted the review in three stages:

1. **Separate shop sessions:** One-on-one structured review with each DOM (Dale: 2026-12-10; Paul: 2026-12-10)
2. **Cross-shop peer session:** Joint call with both DOMs and Nadia (2026-12-11, 45 minutes)
3. **Data audit:** Nadia + Marcus reviewed Athelon platform data — WO completion rates, protocol step compliance, override request patterns (2026-12-12)

---

## 3) RMTS — Dale Renfrow Individual Review (2026-12-10, 38 minutes)

**Cadence quality:**
Dale's operational cadence is strong and self-sustaining. Key metrics from the platform data (last 60 days):
- WOs opened: 14
- WOs closed: 13 (1 in-progress, on-schedule)
- Protocol-covered WOs: 11/13 closed (85% coverage rate)
- Required steps completed without override: 100% (no required-step exceptions in 60-day window)
- ALS board review frequency: Dale reports reviewing the board every Monday morning; Athelon session data confirms 7 DOM logins in last 30 days with ALS board access

**Protocol adoption:**
- PROTO-RMTS-001 (PT6A-114A borescope) remains in active use — used on 4 WOs in last 60 days
- PROTO-RMTS-002 (PT6A-114A igniter plug inspection) — Dale adopted the Athelon base template, made two shop-specific additions. In active use.
- PROTO-RMTS-003 (Cessna 208B fuel system preflight-to-inspection transition) — Dale created from scratch; not yet published to base template library; Marcus reviewing for publication consideration
- PROTO-RMTS-004 (Annual inspection pre-close checklist, piston singles) — adopted from Athelon base template without modification

**Dale's feedback on peer dynamic (Paul Kaminski / WFAS):**
> "Paul's a good mechanic and he runs a clean shop. I walked him through the combustion liner protocol when he was getting started — I think it saved him a day. I don't worry about him. He'll figure it out. The one thing I'd say is: his guys are still printing stuff out. He hasn't fully moved them off paper for the step signatures. That's the next thing."

**Dale's feedback on Sprint 4:**
> "The digest mode was exactly what I asked for. I don't need six alerts during the day — I need one morning summary that tells me what to handle today. And the template diff display — that's good work. Now I can actually see what Marcus changed."

**No compliance issues identified at RMTS.**

---

## 4) WFAS — Paul Kaminski Individual Review (2026-12-10, 52 minutes)

**Cadence quality:**
Paul's shop is 7 weeks into platform adoption. Cadence is developing but shows healthy signs. Key metrics (last 60 days):
- WOs opened: 9
- WOs closed: 7 (2 in-progress, both on-schedule)
- Protocol-covered WOs: 5/7 closed (71% coverage rate)
- Required steps completed without override: 6/7 WOs with required steps = 100% compliance; 1 WO (piston annual) predates Paul's protocol adoption — no protocol on file for that type
- ALS board review frequency: Paul logs in ~3-4 times per week; both C208B ALS boards show active engagement (new entries and status confirmations recorded)

**ALS board health:**
- N416TE (C208B): 47 ALS items; all COMPLIANT; next DUE_SOON item = propeller de-ice boots at 280 hr (6+ months out)
- N7822K (C208B): 44 ALS items; 1 DUE_SOON (PT6A-114A combustion liner, 1,140 hr to interval — within planning horizon); Paul confirmed he has PROTO-WFAS-001 ready for when the inspection comes due
- Piston fleet: ALS boards all COMPLIANT; no DUE_SOON items

**Protocol adoption status:**
- PROTO-WFAS-001 (PT6A-114A borescope, derived from base template): adopted; 1 WO completed under it to date
- PROTO-WFAS-002 (Annual inspection pre-close checklist, C208B): Paul started building this from scratch; ~60% complete in draft
- Paul has not yet adopted protocols for piston annual inspections (4 piston types in fleet)

**Gap identified:** 2 of the 7 WOs closed in the review window were piston annuals with no protocol coverage. Both were completed correctly per external records, but Athelon WO documentation shows step records only in free-text notes, not structured protocol steps.

**Paul's response:**
> "I know I need to get the piston protocols built out. Honestly, I've been focusing on the Caravans first because that's where the life-limited stuff lives. The piston stuff — I know what to do, I've done it a hundred times. But I get it, the platform doesn't know that. Dale says I should just grab the base template and customize it, and that's probably right."

**Paul's feedback on the dual-shop dynamic:**
> "Having Dale across the ramp is actually really useful. He's been on this platform longer and he knows what it can do. I texted him twice in the first week just to ask where something was. I think it's mostly positive. There's no overlap in our customers so it's not competitive."

**Protocol coverage widget (Sprint 4):**
Paul mentioned that the new Protocol Coverage Widget (F-1.5-G-P2, just deployed) immediately surfaced the piston annual gap: "It shows me 71% and I can see exactly which event types are missing. That's useful. I'm going to work through those this week."

---

## 5) Cross-Shop Peer Session (2026-12-11, 45 minutes)

**Participants:** Dale Renfrow (RMTS), Paul Kaminski (WFAS), Nadia Solis (Athelon)

**Agenda:**
1. Shared coordination patterns — what's working, what creates friction
2. Protocol library awareness — gaps in shared knowledge
3. Platform feature adoption — shared priorities
4. Any compliance boundary concerns

**Key discussion points:**

**Coordination patterns:**
Dale and Paul have developed an informal ramp-level communication channel. They share heads-up on aircraft movements, occasional shift timing to avoid shared tooling conflicts (both shops share the single KGJT fuel truck schedule), and once in the last two months Dale loaned RMTS equipment to Paul's crew during a tooling delay. Nadia noted this peer dynamic is healthy and unforced.

**Protocol library awareness:**
Dale walked Paul through PROTO-RMTS-003 (fuel system inspection transition) during the session — first time Paul had seen it. Paul expressed interest in adopting a version at WFAS. Dale offered to share his draft directly; Nadia noted that once Marcus reviews PROTO-RMTS-003 for potential base template publication, WFAS adoption would be cleaner via the library rather than shop-to-shop copy.

**Agreed action:** Nadia to flag PROTO-RMTS-003 to Marcus for base template publication review. If published, WFAS adoption can proceed via standard template adoption workflow (F-1.5-E).

**Compliance boundary discussion:**
Both DOMs confirmed no customer or aircraft overlap. Nadia asked explicitly: "Has either shop performed work on the other shop's registered aircraft?" Both said no. Confirmed: no compliance entanglement risk.

**Both DOMs' platform feature request (joint):**
Dale and Paul independently asked, in the same session, for a "cross-KGJT scheduling view" — a shared calendar showing both shops' major inspection events (without customer or financial details) so they can plan equipment-sharing and avoid peak-period collisions. Nadia logged this as FR-37-01 for product backlog consideration (not committed to any sprint).

---

## 6) Platform Data Audit (2026-12-12) — Marcus + Nadia

Marcus and Nadia reviewed platform data across both shops for the 60-day review window.

### 6.1 WO Completion and Protocol Coverage

| Metric | RMTS | WFAS | Network average (all 9 shops) |
|---|---|---|---|
| WOs opened | 14 | 9 | 8.2 |
| WOs closed | 13 | 7 | 7.4 |
| Protocol-covered WOs | 85% | 71% | 74% |
| Required-step override requests | 0 | 0 | 1.8 per shop |
| Required-step override approvals | 0 | 0 | 0.9 per shop |

**Assessment:** RMTS is above network average on all quality metrics. WFAS is below RMTS but close to network average for a 7-week-old shop; the piston protocol coverage gap is the only specific finding.

### 6.2 ALS Alert Health

| Metric | RMTS | WFAS |
|---|---|---|
| OVERDUE items | 0 | 0 |
| DUE_SOON items open | 2 | 1 |
| DUE_SOON items with WO opened | 2/2 | 0/1 |
| DUE_SOON items with scheduled date | 2/2 | 0/1 |

**Finding:** WFAS has 1 DUE_SOON item (N7822K combustion liner, 1,140 hr to interval) with no WO opened and no scheduled date. At current utilization rates (~60 hr/month), this item will hit the 90-day DUE_SOON threshold in approximately 13 months. No immediate action required, but Nadia flagged this to Paul as a proactive planning opportunity.

**Paul's response (2026-12-12, via platform message):** "Got it. I'll open the planning WO this week so there's something on the schedule."

### 6.3 Evidence and Documentation Quality

Marcus reviewed 5 randomly selected WOs from RMTS and 5 from WFAS for documentation quality (step records, photo attachments, signature completeness).

**RMTS WO documentation audit:**
- All 5 WOs: structured protocol steps with COMPLETED/INSPECTED/N-A markings — PASS
- All 5 WOs: photo attachments present where protocol requires — PASS
- All 5 WOs: IA signature on close-out — PASS
- 1 WO: free-text note in step record was brief ("done") — noted but not flagged as deficiency; protocol step was clearly completed based on context

**WFAS WO documentation audit:**
- 3 of 5 WOs: structured protocol steps with step records — PASS
- 2 of 5 WOs (both piston annuals): no protocol adopted; step records in free-text only — **MINOR FINDING**
- All 5 WOs: IA signature (Paul's own IA cert CO-7721-B) on close-out — PASS
- Photo attachments: 3/5 WOs had photo attachments; 2/5 (piston annuals) had no photos — noted

**Marcus's assessment:**
> "The WFAS piston protocol gap is the only finding. It's not a compliance defect — the work was performed and signed by Paul as IA — but it's a documentation quality gap that the platform exists to close. Paul knows about it. The protocol coverage widget will keep surfacing it until he builds those protocols. That's the system working correctly. No required-step violations at either shop."

---

## 7) Findings Summary and Recommended Adjustments

| Finding | Shop | Severity | Status |
|---|---|---|---|
| F-37-C-01: Piston annual protocol coverage gap (2 WO types uncovered) | WFAS | Minor | Paul acknowledged; protocol build-out planned |
| F-37-C-02: N7822K combustion liner DUE_SOON — no planning WO opened | WFAS | Advisory | Paul committed to open planning WO |
| F-37-C-03: PROTO-RMTS-003 not yet in base template library | Network | Advisory | Marcus to review for publication |
| F-37-C-04: FR-37-01 cross-KGJT scheduling view request (both DOMs) | Product | Logged | FR-37-01 added to backlog; not committed |

**No compliance blockers identified.** Both shops are in active platform use with positive adoption trajectories.

### Recommended Adjustments:

1. **WFAS piston protocol build-out:** Paul to build PROTO-WFAS-003 (piston annual pre-close checklist) using Athelon base template within the next 30 days. Nadia to follow up at Phase 38 cadence check.

2. **PROTO-RMTS-003 base template review:** Marcus to complete publication review of Dale's fuel system inspection transition protocol within 2 weeks. If published, notify WFAS for adoption.

3. **N7822K planning WO:** Paul to open WO-WFAS-007 (planning WO for N7822K combustion liner inspection) before end of December. Athelon notification set at 12-month mark (~2027-12-01 estimated).

4. **FR-37-01 backlog entry:** Cross-KGJT scheduling view logged as feature request; Nadia to assess priority in v1.5 Sprint 5 intake.

---

## 8) Governance Quality Assessment

Nadia's overall assessment:

> "KGJT is the healthiest multi-shop node in the network. RMTS is running at or above all quality benchmarks. WFAS is 7 weeks in and already at network average with one specific gap that they've already committed to addressing. The peer dynamic between Dale and Paul is organic and beneficial — Dale is functioning as an informal mentor without any formal arrangement. The dual-shop model at KGJT is working. The only governance concern I'd flag for Phase 38 is whether WFAS piston coverage closes on schedule — if Paul's protocol build-out stalls, that's worth a direct coaching session."

**WS37-C STATUS: ✅ DONE**
