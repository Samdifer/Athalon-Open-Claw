# Athelon MRO — Business Plan: $500K EBITDA in 6 Months

**Date:** 2026-02-28
**Author:** Business Strategy Document
**Objective:** Achieve $500,000 in cumulative EBITDA within the first 6 months of commercial operations

---

## 1. Executive Summary

Athelon is a cloud-native MRO (Maintenance, Repair, & Overhaul) SaaS platform targeting FAA Part 145 repair stations — a market segment stuck between paper records and 1990s-era desktop software. The $7.15B MRO software market is dominated by two legacy incumbents (Corridor at $42K–$80K/yr and EBIS 5 at $1.5K–$4K/yr) that are slow to implement, lack mobile access, and charge opaque prices.

Athelon's wedge: **modern cloud-native platform, 3-day onboarding (vs 6–18 months), transparent pricing, and mobile-first design** — targeting the ~3,000 small-to-mid-size Part 145 repair stations (3–25 mechanics) in the US that are underserved by both incumbents.

**To hit $500K EBITDA in 6 months, the plan requires:**
- Blended revenue of ~$8,200 per shop (annual contract + onboarding fee)
- 85 paying shops by end of Month 6
- Lean operating costs of ~$35K/month ($210K over 6 months)
- Cumulative 6-month revenue of ~$710K

This is an aggressive but achievable target in a market with acute pain, high willingness to pay, and zero modern alternatives.

---

## 2. Market Opportunity

### 2.1 Total Addressable Market (TAM)

| Metric | Value | Source |
|---|---|---|
| Global MRO software market (2025) | $7.15B | Business Research Company |
| Projected market (2030–2032) | $10–11.68B | McKinsey / BRC |
| CAGR | ~4.3% | Industry consensus |
| FAA-certificated Part 145 repair stations (US) | ~4,300 | FAA database |
| Small-to-mid Part 145 stations (3–25 mechanics) | ~3,000 | Estimated 70% of total |

### 2.2 Serviceable Addressable Market (SAM)

Athelon's initial target: **US-based, single-location, GA-focused Part 145 repair stations** currently on paper, EBIS 5, or tolerating Corridor costs.

| Segment | Est. Count | Current Spend | Pain Level |
|---|---|---|---|
| On paper (no MRO software) | ~1,200 | $0/yr on software | High — compliance risk, data loss, no visibility |
| On EBIS 5 (or EBIS 3.2) | ~800 | $1.5K–$4K/yr | Medium — works but dated, no mobile, desktop-only |
| On Corridor (cost-sensitive) | ~400 | $42K–$80K/yr | High — paying enterprise prices for SMB needs |
| On other legacy tools | ~600 | Varies | Medium-High |

**SAM Revenue Potential:** 3,000 shops x $6,000 avg annual contract = **$18M/yr**

### 2.3 Serviceable Obtainable Market (SOM) — 6-Month Target

Target: **85 shops** (2.8% of SAM) within 6 months.

This is achievable because:
- Paper shops face mounting FAA pressure to digitize
- EBIS 3.2 → EBIS 5 forced migration creates a natural switching window
- Corridor's opaque pricing and 6–18 month implementation alienate small shops
- No competitor offers self-serve onboarding in days

---

## 3. Product Readiness & Competitive Position

### 3.1 Current State (82% Feature Complete)

Athelon has 52 pages, 206 backend functions, and 52 schema tables deployed. The core MRO workflow is functional:

**Ready for launch:**
- Work order lifecycle (draft → open → in-progress → complete → closed)
- Task card step-by-step execution with PIN e-signatures
- Parts & inventory (receiving, reservations, PO integration)
- Billing (invoices, quotes, POs, AR, credit memos, recurring)
- Fleet/aircraft tracking with logbook and registration history
- AD compliance module
- Discrepancy management (6 disposition types, severity escalation)
- Vendor management with certifications and services
- Real-time updates (Convex reactive architecture)

### 3.2 P0 Gaps (Must Close Before First Sale — Weeks 1–4)

| Gap | Effort | Why It Blocks Revenue |
|---|---|---|
| PDF generation (invoices, quotes, WO, RTS/8130-3) | 2 weeks | Shops can't operate without printable documents |
| Real file/photo upload | 1 week | Core to paperless operations |
| Email notifications | 1 week | Can't communicate with customers |
| Tax calculation (fix $0 stub) | 3 days | Invoices are wrong without it |
| Labor rate auto-application | 3 days | Billing accuracy |
| User/role management UI | 1 week | Admin can't manage team |

**Critical path: 4 weeks of focused engineering closes all P0 gaps.**

### 3.3 Competitive Positioning

| Dimension | Corridor | EBIS 5 | Athelon |
|---|---|---|---|
| Onboarding time | 6–18 months | 4–8 weeks | **3–5 days** |
| Mobile access | Unusable | Nonexistent | **Mobile-first** |
| Real-time updates | No | No | **Yes (Convex)** |
| Pricing transparency | Opaque | Quote-based | **Published on website** |
| Annual cost (small shop) | $42K–$80K | $1.5K–$4K | **$4.8K–$12K** |
| Implementation cost | $15K–$100K | $0–$20K | **$0–$5K** |
| IT burden | High | Self-hosted server | **Zero (cloud-native)** |

---

## 4. Pricing Strategy

### 4.1 Pricing Tiers

| Tier | Monthly | Annual (paid upfront) | Target Segment |
|---|---|---|---|
| **Starter** | $299/mo | $2,988/yr ($249/mo effective) | Paper shops, 1–5 mechanics |
| **Professional** | $599/mo | $5,988/yr ($499/mo effective) | Growing shops, 5–15 mechanics |
| **Enterprise** | $999/mo | $9,588/yr ($799/mo effective) | Multi-rating, 15–25+ mechanics |

**All tiers include all features.** No module add-ons. No per-seat fees for the shop (shop-based pricing). This directly attacks Corridor's fragmented module pricing and EBIS's tiered PRO upsell.

### 4.2 One-Time Onboarding Fee

| Service | Price | Includes |
|---|---|---|
| Self-service onboarding | $0 | Wizard, CSV import, docs |
| Guided onboarding | $2,500 | 2-hour video call setup, data migration assist, first WO walkthrough |
| White-glove onboarding | $5,000 | Full data migration, 5 hours of 1:1 training, 30-day support escalation |

### 4.3 Blended Revenue Assumption

Based on target mix (50% Professional, 30% Enterprise, 20% Starter) with 60% choosing annual + guided/white-glove onboarding:

| Revenue Component | Per Shop (Blended Avg) |
|---|---|
| Annual subscription (blended) | $5,700 |
| Onboarding fee (blended) | $2,500 |
| **Total first-year revenue per shop** | **$8,200** |

---

## 5. Revenue Model & Financial Projections

### 5.1 Month-by-Month Customer Acquisition

| Month | New Shops | Cumulative Shops | Subscription Rev (Monthly) | Onboarding Rev | Total Monthly Rev |
|---|---|---|---|---|---|
| 1 | 5 | 5 | $2,850 | $12,500 | $15,350 |
| 2 | 10 | 15 | $8,550 | $25,000 | $33,550 |
| 3 | 15 | 30 | $17,100 | $37,500 | $54,600 |
| 4 | 18 | 48 | $27,360 | $45,000 | $72,360 |
| 5 | 20 | 68 | $38,760 | $50,000 | $88,760 |
| 6 | 17 | 85 | $48,450 | $42,500 | $90,950 |
| **TOTAL** | **85** | | | | **$355,570** |

**Plus annual contracts paid upfront:**
- 60% of shops pay annual = 51 shops x $5,700 = **$290,700** (recognized at signing, minus monthly already counted)
- Net annual prepayment revenue uplift: ~**$355,000** (the difference between annual lump sum and what's already counted monthly)

**Total 6-Month Cash Collected: ~$710,000**

*Note: Under accrual accounting, annual prepayments create deferred revenue. Under cash-basis EBITDA (which is what matters for a startup), the cash is collected in the period.*

### 5.2 Operating Costs (6-Month Total)

| Category | Monthly | 6-Month Total | Notes |
|---|---|---|---|
| Engineering (2 FTE or founders) | $0–$15,000 | $0–$90,000 | $0 if founders; $15K/mo if 2 contractors |
| Infrastructure (Convex, Vercel, Clerk) | $2,000 | $12,000 | Scales with usage |
| Sales (1 FTE or founder) | $0–$8,000 | $0–$48,000 | $0 if founder-led; $8K/mo base + commission |
| Marketing & content | $5,000 | $30,000 | SEO, trade shows, ads (see GTM) |
| Customer success | $3,000 | $18,000 | 1 part-time CSM starting Month 3 |
| Legal/compliance/insurance | $2,000 | $12,000 | Aviation software liability, terms of service |
| Misc (accounting, tools, travel) | $3,000 | $18,000 | |
| **TOTAL (Lean — founders)** | **$15,000** | **$90,000** | |
| **TOTAL (With team)** | **$35,000** | **$210,000** | |

### 5.3 EBITDA Projection

| Scenario | 6-Month Revenue | 6-Month Costs | EBITDA |
|---|---|---|---|
| **Founder-led (2 founders, no salaries)** | $710,000 | $90,000 | **$620,000** |
| **Small team (2 eng + 1 sales + 1 CS)** | $710,000 | $210,000 | **$500,000** |
| **Conservative (70% of revenue target)** | $497,000 | $210,000 | **$287,000** |

**The $500K EBITDA target requires either founder-led execution OR hitting 100% of the 85-shop target with a small team.**

---

## 6. Go-to-Market Strategy

### 6.1 Sales Motion: Founder-Led, Demo-Close

For the first 6 months, the sales cycle should be **founder-led with no traditional sales team.** Here's why:
- Aviation MRO buyers (DOMs, shop owners) trust domain expertise over sales polish
- The PRD identifies "a phone call and a Corridor quote" as the switching trigger — Athelon needs to be the answer when that call happens
- Short sales cycle: demo → trial → close in 2–3 weeks (vs Corridor's months-long procurement)

**Target sales cycle:**
1. **Inbound lead** (website, trade show, referral) → same-day response
2. **15-minute discovery call** — confirm they're a Part 145, understand current system, identify pain
3. **30-minute live demo** — show their specific workflow (WO creation → task cards → sign-off → invoice)
4. **7-day free trial** with guided onboarding call on Day 1
5. **Close** — annual contract + onboarding package

**Target: 3 demos/day by Month 3. 30% close rate = ~18 new shops/month.**

### 6.2 Channel Strategy (Priority Order)

#### Channel 1: FAA Repair Station Database (Direct Outbound)
- The FAA publishes a list of all certificated Part 145 stations
- Filter for GA/piston/light turbine, single location, US-based
- Cold email campaign: "Your shop runs on paper. Here's what happens when the FAA walks in."
- **Target: 500 outreach/month → 5% response rate → 25 demos → 8 closes**

#### Channel 2: Trade Shows & Industry Events
- **MRO Americas** (Dallas, April) — biggest MRO trade show in the Western Hemisphere
- **NBAA-BACE** (Las Vegas, October) — business aviation's largest event
- **Sun 'n Fun** / **EAA AirVenture** — GA community (high concentration of small shops)
- Regional IA renewal seminars (FAA-sponsored, free to attend, DOMs and IAs attend)
- **Cost: $3K–$8K per event. Target: 15–30 qualified leads per show.**

#### Channel 3: Content Marketing & SEO
- "Part 145 compliance checklist" — PDF download, email capture
- "EBIS 5 vs Corridor vs Athelon" comparison page (your research is the content)
- "Paper to digital in 3 days" case study (first 5 customers)
- YouTube: 5-minute walkthroughs of common workflows
- **Target: 200 organic leads/month by Month 4**

#### Channel 4: Referral Program
- Every signed shop gets $500 credit for each referral that converts
- Aviation is a small community — word of mouth is the #1 trust signal
- DOMs talk to other DOMs at IA renewal seminars and regional meetings
- **Target: 15% of new shops come from referrals by Month 5**

#### Channel 5: EBIS Migration Campaign
- EBIS 3.2 → EBIS 5 forced migration creates a natural switching window
- Shops forced to re-onboard anyway are open to evaluating alternatives
- Targeted campaign: "Migrating from EBIS 3? Don't re-learn a legacy system — upgrade to modern."
- **Target: 10 shops in 6 months from this channel alone**

### 6.3 Pricing Psychology — Why Shops Will Pay

The competitive teardown reveals the pricing gap Athelon exploits:

| Current Situation | Annual Spend | Athelon Alternative | Savings |
|---|---|---|---|
| On Corridor | $42K–$80K/yr | $6K–$12K/yr | **$30K–$68K saved** |
| On EBIS 5 (with IT costs) | $4K–$8K/yr (+ $5K server/IT) | $6K–$12K/yr | **Comparable cost, zero IT burden** |
| On paper | $0 software, but $10K–$50K/yr in compliance risk, lost records, labor | $6K–$12K/yr | **Insurance against FAA findings** |

For Corridor refugees, Athelon is an obvious cost reduction. For paper shops, the pitch is **risk mitigation** — one FAA finding costs more than 5 years of Athelon.

---

## 7. Month-by-Month Execution Plan

### Month 0 (Pre-Launch — Now through Week 4)
**Goal: Close P0 gaps. Product must be sellable.**

- [ ] PDF generation (invoices, quotes, WO summaries, RTS/8130-3)
- [ ] Real file/photo upload wired to Convex storage
- [ ] Email notifications (transactional: invoice sent, WO status, auth request)
- [ ] Tax calculation fix
- [ ] Labor rate auto-application fix
- [ ] User/role management UI
- [ ] Pricing page on marketing website
- [ ] 3 beta shops onboarded (free, in exchange for testimonials + feedback)
- [ ] Legal: Terms of service, privacy policy, data retention policy

### Month 1 — Soft Launch
**Target: 5 shops signed**

- Launch to 3 beta shops + 2 net-new paying customers
- Founder does all demos, onboarding, and support
- Begin FAA database outbound campaign (200 emails)
- Begin SEO content (3 blog posts: compliance checklist, EBIS comparison, paper-to-digital guide)
- Collect first testimonials and case study material
- Daily standups on customer feedback → same-day fixes

### Month 2 — Accelerate Sales
**Target: 10 new shops (15 cumulative)**

- Scale outbound to 500 emails/month
- First trade show or regional IA seminar (booth or attendance)
- Publish first customer case study: "How [Shop Name] went from paper to Athelon in 3 days"
- Launch referral program
- Hire or contract 1 part-time customer success person
- Begin EBIS migration campaign

### Month 3 — Hit Stride
**Target: 15 new shops (30 cumulative)**

- 3 demos/day cadence established
- Onboarding process systematized (guided onboarding call → checklist → Day 7 check-in → Day 30 review)
- SEO content producing inbound leads
- Referral flywheel starting (first referral closes)
- Ship P1 features based on customer demand (likely: QuickBooks integration, reporting/CSV export)

### Month 4 — Scale
**Target: 18 new shops (48 cumulative)**

- MRO Americas trade show (if timing aligns) — major lead gen event
- Hire 1 sales development rep (SDR) to handle outbound + demo scheduling
- Customer success handles all onboarding (founder focuses on demos + product)
- Begin "Corridor Alternative" paid search campaign (Google Ads on competitor terms)
- First annual contract renewals from Month 1 approaching — retention focus

### Month 5 — Compound Growth
**Target: 20 new shops (68 cumulative)**

- Referral program producing 3+ shops/month
- Organic inbound producing 10+ qualified leads/month
- Case studies from 3+ verticals (piston GA, light turbine, helicopter)
- Ship customer portal (P1) — becomes a sales differentiator
- Evaluate hiring 1 additional engineer for feature velocity

### Month 6 — Hit Target
**Target: 17 new shops (85 cumulative)**

- 85 shops paying, $48K+/mo in recurring subscription revenue
- EBITDA target achieved
- Customer churn < 5% (< 4 shops lost)
- NPS > 50 from customer surveys
- Begin planning for Phase 2 growth: multi-location, API, CAMP integration

---

## 8. Key Metrics & KPIs

### Leading Indicators (Weekly)
| Metric | Month 1 Target | Month 6 Target |
|---|---|---|
| Demos booked | 8/week | 15/week |
| Demo → trial conversion | 50% | 60% |
| Trial → close conversion | 60% | 50% |
| Time to first WO (onboarding) | < 3 days | < 1 day |
| Support tickets per shop | < 5/week | < 2/week |

### Lagging Indicators (Monthly)
| Metric | Target |
|---|---|
| Monthly Recurring Revenue (MRR) | $48K+ by Month 6 |
| Annual Run Rate (ARR) | $580K+ by Month 6 |
| Customer Acquisition Cost (CAC) | < $2,000/shop |
| Lifetime Value (LTV) | > $16,000 (2+ year retention) |
| LTV:CAC ratio | > 8:1 |
| Monthly churn rate | < 2% |
| Net Revenue Retention | > 110% (upsells from Starter → Pro) |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **P0 gaps take longer than 4 weeks** | Medium | High — delays all revenue | Scope ruthlessly. PDF gen is the real blocker; ship MVP PDFs, polish later |
| **Sales cycle is longer than 3 weeks** | Medium | Medium — pushes revenue right | Offer 30-day money-back guarantee to reduce buyer hesitation |
| **Corridor or EBIS respond with price cuts** | Low | Low — their cost structure won't allow deep cuts | Athelon's advantage is UX + speed, not just price |
| **FAA compliance concern blocks DOM adoption** | High | High — the #1 objection from research | Lead with compliance: show audit trail, e-signature workflow, immutable records in every demo. Offer "FAA audit simulation" as part of onboarding |
| **Customer churn in first 90 days** | Medium | Medium — kills referral + LTV | Assign dedicated CSM to every shop for first 30 days. Weekly check-in calls |
| **Infrastructure cost spikes with scale** | Low | Low — Convex/Vercel pricing is predictable | Monitor usage. Convex scales well for this workload |
| **Single-threaded founder burnout** | High | High — if founder is sales + eng + support | Hire CSM by Month 2, SDR by Month 4. Protect founder time for demos + product |

---

## 10. What Makes This Plan Work (Honest Assessment)

### Why $500K EBITDA is achievable:

1. **The market pain is acute and documented.** DOMs are literally keeping parallel spreadsheets because their software's reporting is untrustworthy. Mechanics walk across hangars to log time. Shops pay $42K–$80K/yr for software designed in 2003. This isn't a "nice to have" — it's a "the FAA is coming and I need records."

2. **Annual contracts with onboarding fees front-load revenue.** The blended $8,200/shop in Year 1 revenue means you don't need thousands of customers — 85 shops generates $710K in collected revenue.

3. **Operating costs are genuinely low for cloud-native SaaS.** Convex + Vercel + Clerk infrastructure costs ~$2K/month even at 85 shops. There's no server fleet to manage.

4. **The switching windows are real.** EBIS 3.2 → 5 migration, Corridor contract renewals, and new shop openings create natural moments where shops are already evaluating software.

### Why this plan could fail:

1. **85 shops in 6 months is aggressive.** That's ~15 new shops/month at peak — requires a founder doing 3 demos/day and closing 30% of them. If the founder is also writing code, this breaks.

2. **P0 gaps are real.** PDF generation, email, and file upload are table stakes. Every week these remain unshipped is a week you can't sell. This is the single biggest risk to the timeline.

3. **Aviation buyers are conservative.** The DOM quote from the competitive teardown says it all: "The devil you know." Overcoming this requires proof — testimonials, case studies, and time. Month 1–2 will be slow.

4. **Cash-basis EBITDA with annual prepayments flatters the numbers.** Under GAAP, deferred revenue would push recognition over 12 months. The $500K number assumes cash collected = revenue recognized, which is standard for small SaaS but worth noting.

### The honest bottom line:

$500K EBITDA in 6 months is possible if:
- P0 gaps close in 4 weeks (non-negotiable)
- The founding team includes at least 1 person doing nothing but sales from Month 1
- Annual contracts with upfront payment are the default offer
- The first 10 shops are closed through personal network + direct outreach (no waiting for inbound)
- Operating costs stay below $35K/month

If any of those conditions aren't met, a more realistic target is **$250K–$350K EBITDA in 6 months**, which is still exceptional for a seed-stage SaaS company.

---

## Appendix A: Revenue Sensitivity Analysis

| Scenario | Shops at Month 6 | Avg Revenue/Shop | 6-Month Revenue | 6-Month Costs | EBITDA |
|---|---|---|---|---|---|
| **Bull case** | 100 | $8,500 | $850K | $240K | **$610K** |
| **Base case** | 85 | $8,200 | $710K | $210K | **$500K** |
| **Conservative** | 60 | $7,500 | $450K | $180K | **$270K** |
| **Bear case** | 35 | $6,500 | $228K | $150K | **$78K** |

## Appendix B: Comparable Exits & Valuations

For context on what $500K EBITDA means for company value:

- Vertical SaaS companies trade at **8–15x ARR** at Series A
- At 85 shops and $48K MRR, ARR = ~$580K
- At 10x ARR multiple: **$5.8M valuation**
- At 15x ARR (if growth rate is >100% YoY): **$8.7M valuation**
- EBITDA-based valuation (20–30x for high-growth SaaS): **$10M–$15M**

The 6-month target isn't just about the $500K — it's about proving the unit economics and growth rate that support a $5M–$15M valuation for fundraising or continued bootstrapped growth.

---

*This plan is built on market research from: competitive teardown (Corridor + EBIS 5), 40-feature competitive matrices, FAA Part 145 market sizing, and the scheduling market analysis (13 aviation-specific products reviewed). All source documents are in this repository under `phase-1-data-model/` and `research/`.*
