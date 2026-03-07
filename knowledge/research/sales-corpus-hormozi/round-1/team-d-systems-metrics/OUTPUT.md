# OUTPUT.md — Team D: Sales Systems, KPIs & Management Practices
**Research Corpus:** Alex Hormozi / Acquisition.com  
**Date:** 2026-03-07  
**Team:** D (Systems & Metrics)  
**Sources:** See SOURCE-LOG.md | Raw notes: See RAW-NOTES.md

---

## Executive Summary

Alex Hormozi's sales system is built on one core principle: **you can only fix what you measure, and you should only fix the biggest constraint first**. His operating model combines a tiered conversion funnel with benchmark-driven diagnostics, a tiered compensation structure that rewards excellence and self-selects out underperformers, and a manager cadence focused on high-frequency coaching over passive oversight.

For a B2B/B2C sales team (especially in a service or high-ticket context like aviation charter), this translates to a CRM-instrumented operating system where every stage of the pipeline has a measurable conversion rate, every rep has a visible performance tier, and every manager review answers one question: **"Where is the constraint today?"**

---

## 1. Sales System Architecture Recommendations

### 1.1 Funnel Stage Model

Adopt the Hormozi four-stage conversion model as the backbone of CRM pipeline design:

```
LEAD ACQUIRED
     │
     ▼
[Stage 1] APPOINTMENT SET
     │  Metric: Set Rate (leads → booked appts)
     ▼
[Stage 2] SHOW RATE
     │  Metric: Show Rate (booked → showed)  Target: ≥70%
     ▼
[Stage 3] OFFER MADE
     │  Metric: Offer Rate (showed → offered)  Target: ~100%
     ▼
[Stage 4] CLOSED / WON
          Metric: Close Rate (offered → closed)  Target: ≥40%
```

**Extensions for multi-touch B2B environments:**
- Add a `FOLLOW-UP SEQUENCE` sub-stage between Show and Offer for long-cycle deals
- Add `PROPOSAL SENT` as discrete stage with its own conversion tracking
- Track `Days in Stage` to detect stalling (proxy for rep avoidance behavior)

### 1.2 Setter / Closer Role Split

Hormozi's team structure separates **lead qualification + booking** (Setter) from **consultative close** (Closer):

| Role | Primary Responsibility | Key Activity Metric |
|---|---|---|
| **Setter** | Outbound outreach, inbound response, BANT qualification, appointment booking, closer edification | Contacts/day, Set Rate, Show Rate |
| **Closer** | Discovery, consultative presentation, objection handling, close | Offer Rate, Close Rate, Revenue/call |

- Recommended ratio observed: ~4 Closers : 3 Setters
- **Lead routing:** "Free-for-all" model (setters compete for leads) preferred over round-robin — rewards hustle, increases throughput
- Setter notes MUST transfer to Closer in CRM before each call

### 1.3 Pre-Call System

Every sales call should be preceded by:
1. BANT qualification recorded in CRM (by Setter)
2. 5-minute pre-call research by Closer (pulled from CRM + public sources)
3. Closer references Setter notes in opening: "I hear you're working on X — is that right?"
4. Setter has edified Closer during qualification: "[Closer Name] has helped 30 companies like yours achieve Y"

### 1.4 Sales Call Execution (CLOSER Framework)

All closers should execute calls using the **C.L.O.S.E.R. framework** as the scripted spine:

| Step | Name | Purpose |
|---|---|---|
| **C** | Clarify | Establish why prospect is here; uncover goals and pain |
| **L** | Label | Name the problem back to them non-threateningly |
| **O** | Overview | History of failed attempts; position your solution as the fix |
| **S** | Sell the Vacation | Pitch the outcome/destination — top 3 result drivers |
| **E** | Explain | Handle objections (circumstance / others / self archetypes) |
| **R** | Reinforce | Post-purchase confirmation — video, card, onboarding; lock in buyer's decision |

CRM must capture which CLOSER stage the call reached before stalling or dropping.

### 1.5 Constraint-First Operating Discipline

Every week, the sales manager answers: **"Which stage in the funnel is furthest below benchmark?"** That stage — and only that stage — gets intervention that week.

**Priority order for constraint resolution:**
1. Org/people issues (manager calibration, underperformer management) — always first
2. Show Rate (upstream; high leverage)
3. Close Rate (downstream but high-value)
4. Offer Rate (should be near 100% if show rate is healthy)
5. Set Rate (upstream of all; governed by lead quality + setter behavior)

---

## 2. KPI Dashboard Specification

### 2.1 Primary KPI Ladder

| KPI | Definition | Benchmark Target | Warning Threshold | Critical Threshold |
|---|---|---|---|---|
| **Set Rate** | Leads → Booked Appointments | Varies by channel | <30% | <15% |
| **Show Rate** | Booked → Showed Up | ≥70% | <60% | <50% |
| **Offer Rate** | Showed → Received Offer | ≥95% | <85% | <70% |
| **Close Rate** | Offered → Purchased | ≥40% | <30% | <25% |
| **Revenue/Call** | Revenue ÷ Calls Taken | TBD by ASP | - | - |
| **Revenue/Rep/Week** | Total revenue attributable to rep | TBD by plan | - | - |

### 2.2 Activity Metrics (Leading Indicators)

| Metric | Target | Purpose |
|---|---|---|
| Contacts/day (Setter) | 50–100 | Volume discipline; source of Set Rate |
| Follow-up attempts/lead | ≥5 | Persistence tracking |
| Calls taken/day (Closer) | 6–10 (high-ticket) | Capacity utilization |
| Avg call duration | 45–90 min (high-ticket) | Proxy for engagement quality |
| Time to first response | <5 minutes (inbound) | Speed-to-lead is critical |
| Days in stage (avg) | Stage-specific SLA | Detects pipeline stalling |

### 2.3 Rep Performance Scorecard

Each rep scorecard rolls up daily and weekly:

```
Rep Scorecard (Weekly)
─────────────────────
Name: [Rep Name]
Role: [Setter / Closer]
Period: [Week]

ACTIVITY
  Contacts Made:        [N]
  Calls Taken:          [N]
  Follow-Up Sequences:  [N]

CONVERSION
  Set Rate:             [%]  vs target [%]
  Show Rate:            [%]  vs target [%]
  Close Rate:           [%]  vs target [%]  ← COMP TIER TRIGGER

REVENUE
  Deals Closed:         [N]
  Revenue Closed:       [$]
  Revenue/Call:         [$]

COMP TIER
  Current Close Rate:   [%]
  Commission Rate:      [%]
  Est. Commission:      [$]
```

### 2.4 CRM Instrumentation Requirements

**Must-have CRM fields per deal/contact:**

| Field | Type | Purpose |
|---|---|---|
| `lead_source` | Enum | Attribution |
| `setter_id` | FK | Routing and attribution |
| `closer_id` | FK | Routing and attribution |
| `bant_budget_qualified` | Bool | Qualification gating |
| `bant_authority_confirmed` | Bool | Qualification gating |
| `bant_need_confirmed` | Bool | Qualification gating |
| `bant_timing_confirmed` | Bool | Qualification gating |
| `appt_booked_at` | Timestamp | Set Rate denominator |
| `appt_showed_at` | Timestamp | Show Rate numerator |
| `offer_made_at` | Timestamp | Offer Rate numerator |
| `closer_stage_reached` | Enum (C/L/O/S/E/R) | Call quality diagnostic |
| `objection_type` | Enum (circumstance/other/self/none) | Training data |
| `closed_at` | Timestamp | Close Rate numerator |
| `deal_value` | Currency | Revenue tracking |
| `days_in_stage` | Computed | Stall detection |
| `call_recording_url` | URL | Coaching review |
| `setter_notes` | Text | Pre-call context handoff |
| `follow_up_attempt_count` | Int | Persistence tracking |

### 2.5 Minimum Data Model for Sales Execution Quality

```
Table: sales_activities
  id, rep_id, activity_type, contacted_at, outcome, notes

Table: opportunities  
  id, lead_id, setter_id, closer_id, lead_source,
  bant_budget, bant_authority, bant_need, bant_timing,
  stage (enum: lead/set/showed/offered/closed/lost),
  closer_stage_reached (enum: C/L/O/S/E/R/none),
  objection_type, deal_value, created_at, closed_at,
  call_recording_url, setter_notes, follow_up_count

Table: stage_transitions
  id, opportunity_id, from_stage, to_stage, transitioned_at, rep_id

Table: rep_weekly_scorecard  (materialized view or computed)
  rep_id, week_start, contacts, calls_taken, sets, shows,
  offers, closes, revenue, close_rate, comp_tier, commission

Table: funnel_metrics_daily  (aggregate)
  date, set_rate, show_rate, offer_rate, close_rate,
  revenue_total, calls_total, new_leads
```

---

## 3. Coaching & Governance Cadence

### 3.1 Manager Weekly Rhythm

| Cadence | Activity | Purpose |
|---|---|---|
| **Daily (async)** | Review rep scorecards in dashboard | Early warning on activity or conversion drop |
| **Daily standup (5–10 min)** | Team activity numbers + wins + blocks | Momentum, accountability, fast problem surfacing |
| **Monday (weekly)** | Funnel diagnostic: which stage is the constraint? | Set weekly intervention priority |
| **Mid-week (Wednesday)** | 1:1 with flagged reps (below threshold) | Coaching before week closes |
| **Friday** | Weekly scorecard review + rep ranking | Visible leaderboard update; recognition; comp tier check |
| **Monthly** | Full funnel retrospective + comp tier reset | Identify pattern trends; adjust benchmarks if needed |
| **Quarterly** | Bottom 10% review + team calibration | Pruning decision + hiring plan |

### 3.2 Call Review Protocol

Every week, manager reviews minimum:
- 2 calls per rep (1 won, 1 lost) — look for CLOSER framework adherence
- 1 "mystery" call selected randomly by system

**Call review rubric:**
1. Did rep Clarify the real reason prospect came?
2. Did rep Label the problem accurately?
3. Did rep Overview past attempts before pitching?
4. Did rep Sell the Vacation (outcome, not feature)?
5. Did rep correctly identify and handle objection type?
6. Did rep Reinforce the decision post-close?
7. Tone, pacing, listening discipline

### 3.3 Training Loop Architecture

**New Rep Onboarding (First 2 Weeks):**
```
Day 1:    Script read-through with manager interruption (30–40 interruptions = progress signal)
Day 2–3:  Script memorization + product/service deep dive
Day 4–5:  Role-play with manager as prospect (multiple rounds)
Day 6–7:  Shadow top-performing closer on live calls
Day 8–10: Reverse shadow (rep leads call, closer observes)
Day 11+:  Solo calls with mandatory call recording
Week 2:   Daily debrief on first solo calls; intensive correction
```

**Ongoing Training:**
- Weekly role-play drill: one objection type per session
- Monthly "skills tournament": reps compete on scripted scenario, winner recognized
- Top-performer showcase: monthly call replay of best close; team debrief
- Manager maintains a "greatest hits" library of calls in CRM for new rep onboarding

### 3.4 Performance Management Gates

| Close Rate | Manager Action |
|---|---|
| ≥80% | Celebrate publicly; comp tier 25%; fast-track for team lead consideration |
| 70–79% | Recognition; comp tier 15%; hold steady |
| 60–69% | Recognition; comp tier baseline; verbal encouragement |
| 50–59% | Keep job; formal improvement plan triggered; weekly 1:1 coaching |
| <50% | PIP with 4-week resolution window; terminate if no improvement |

**Bottom 10% Review (Quarterly):**
- Rank all reps by close rate × revenue/call composite score
- Bottom 10% automatically enters structured coaching review
- Outcome: stay (with plan), transfer (to setter if closer), or exit
- Pruning is a *team health* mechanism, not just performance management

---

## 4. Metric Gaming Risks & Controls

### 4.1 Known Gaming Vectors

| Metric | Gaming Risk | Description |
|---|---|---|
| **Show Rate** | Cherry-picking appointments | Rep books only high-probability leads to inflate show rate |
| **Close Rate** | Discounting / term manipulation | Rep offers unauthorized discounts to close; inflates close rate but destroys margin |
| **Close Rate** | Qualifying out prematurely | Rep marks lead as "unqualified" to protect close rate before offering |
| **Activity counts** | Log stuffing | Rep logs contacts that weren't real attempts |
| **Offer Rate** | Sandbagging | Rep "offers" to all showed leads regardless of qualification, to hit 100% |
| **Follow-up count** | Automated empty outreach | High follow-up count from templates with no human engagement |
| **Deal value** | Booking in the wrong period | Backdating or forward-dating closes to hit weekly/monthly targets |

### 4.2 Control Mechanisms

| Control | Addresses | Implementation |
|---|---|---|
| **Mandatory call recording** | Cherry-picking, log stuffing, premature disqualification | All calls recorded in CRM; random sample audited weekly |
| **Gross margin by rep** | Discounting gaming | Track deal margin, not just close rate; comp tied to margin bands |
| **Lead → Show audit** | Cherry-picking | Manager reviews distribution of lead quality sources per rep |
| **BANT completion rate** | Sandbagging offers | CRM enforces BANT fields before offer stage is unlocked |
| **Time-stamped stage transitions** | Period gaming | Stage transitions auto-timestamped by CRM; manual overrides flagged for review |
| **Days-in-stage alerts** | Pipeline padding | Automatic flag if deal stays in a stage beyond SLA; forces manager review |
| **Disqualification review queue** | Premature disqualification | All leads marked lost/unqualified before offer go to manager approval queue |
| **Composite scorecard** | Single-metric gaming | Comp tier and rank calculated from composite (close rate + revenue/call + activity score) |
| **Peer comparison** | Context calibration | Rep metrics always shown relative to team median and top quartile |

### 4.3 Structural Anti-Gaming Design Principles

1. **Never comp on activity alone** — creates log stuffing; activity metrics are for coaching, not comp
2. **Comp denominator must include all leads taken** — not just "offered" leads (prevents cherry-picking)
3. **Margin floors before commission unlocks** — prevents close-at-any-cost behavior
4. **Manager sees raw data + computed metrics** — not just aggregates; spot patterns in outlier reps
5. **Rolling 30-day close rate, not weekly** — prevents period gaming while maintaining recency
6. **Qualitative call score** (1–5) added to scorecard — manager's subjective score balances pure numbers

---

## 5. CRM Instrumentation Priority Roadmap

### Phase 1 — Minimum Viable Instrumentation (Month 1)
- [ ] Funnel stages configured: Lead / Set / Showed / Offered / Closed / Lost
- [ ] Rep assignment fields (setter_id, closer_id)
- [ ] BANT qualification fields
- [ ] Timestamped stage transitions
- [ ] Call recording URL attachment
- [ ] Basic weekly rep scorecard report

### Phase 2 — Diagnostic Layer (Month 2)
- [ ] Conversion rate calculations by stage (auto-computed)
- [ ] Days-in-stage tracking + alerts
- [ ] Disqualification review queue
- [ ] CLOSER framework stage field on closed/lost deals
- [ ] Objection type field
- [ ] Funnel KPI dashboard (set/show/offer/close rates by day/week/rep)

### Phase 3 — Comp & Coaching Layer (Month 3)
- [ ] Close rate tiering and commission calculation automation
- [ ] Composite scorecard (activity + conversion + revenue)
- [ ] Rep ranking leaderboard (visible to team)
- [ ] Call review sampling queue for manager
- [ ] Bottom 10% flag at quarterly reset
- [ ] Training record log (roleplays completed, call reviews done)

---

## 6. Key Principles Summary (Hormozi's Axioms for Sales Systems)

1. **Fix the constraint first.** The weakest link in the funnel determines total throughput. Don't optimize non-constraints.
2. **Org issues are always upstream of conversion issues.** If management is broken, metric fixes won't stick.
3. **Winners win, losers lose — by design.** The comp structure should create a natural performance filter.
4. **Training density matters.** 30–40 interruptions on Day 1 > polite feedback over weeks. Fast feedback = compressed learning.
5. **Benchmarks before interventions.** You can't call something a problem without a target. Know your "ideal scene."
6. **Proactive beats round-robin.** Lead routing that rewards hustle produces better throughput than fair distribution.
7. **Post-sale is part of the sale.** Reinforcement in the first 48 hours determines repeat purchase. Track NPS/activation within 48 hours.
8. **Everything is a test.** Weekly CRO iteration with measurement is more valuable than quarterly planning cycles.

---

*Sources: S1–S8 as documented in SOURCE-LOG.md. All benchmarks are Hormozi-derived; calibrate to your specific market and ASP.*
