# Customer Support, SLAs, and Vendor Viability — B2B Buyer Research

**Document:** 05 in the B2B Buyer Evaluation series
**Product:** Athelon — FAA Part 145 Aircraft Maintenance MRO SaaS
**Date:** 2026-03-12
**Audience:** Founders and sales leads navigating enterprise procurement, handling vendor risk objections, and designing a customer success motion

---

## Executive Summary

"You're a startup. What happens if you go out of business and my maintenance records are locked in your system?" This is the single most common objection Athelon will face in any deal above $15K ARR. It is not irrational — a Director of Maintenance whose FAA-required records become inaccessible faces regulatory exposure, not just inconvenience.

This document covers every axis of the startup vendor risk problem: what buyers check, what they demand contractually, how established vendors answer these questions, and the exact playbook an early-stage founder should run to compete on trust rather than size. The document also covers support tier expectations, SLA structures, customer success program design, reference and social proof requirements, and contract terms that raise red flags in legal review.

The thesis: **a well-structured early-stage company that proactively addresses every risk vector can win deals against established vendors by being more transparent, more responsive, and more willing to put skin in the game than incumbents.**

---

## Table of Contents

1. [Support Expectations by Buyer Segment](#1-support-expectations-by-buyer-segment)
2. [SLA Requirements B2B Buyers Demand](#2-sla-requirements-b2b-buyers-demand)
3. [Vendor Viability Assessment — How Buyers Evaluate Startup Risk](#3-vendor-viability-assessment--how-buyers-evaluate-startup-risk)
4. [Vendor Lock-In Concerns and Data Portability](#4-vendor-lock-in-concerns-and-data-portability)
5. [Customer Success Programs That Reduce Churn](#5-customer-success-programs-that-reduce-churn)
6. [Reference and Social Proof Requirements](#6-reference-and-social-proof-requirements)
7. [Contract and Procurement — Terms, Structure, Red Flags](#7-contract-and-procurement--terms-structure-red-flags)
8. [The Athelon Playbook — Competing on Trust Against Established Vendors](#8-the-athelon-playbook--competing-on-trust-against-established-vendors)

---

## 1. Support Expectations by Buyer Segment

### 1.1 Why Support Expectations Vary Dramatically by Segment

The gap between what an SMB repair station expects and what a mid-market or enterprise MRO demands is not incremental — it is categorical. A four-person shop in Tulsa that used to run everything on a whiteboard is delighted by a response within a day. A multi-location repair station handling commercial aircraft may be down hundreds of thousands of dollars per hour when a squawk cannot be closed because the maintenance management software is unavailable or unresponsive.

The aviation context compounds this. When a commercial aircraft is AOG (Aircraft on Ground) and a work order cannot be signed off due to a software issue, the financial and regulatory consequences are immediate. Part 145 operators expect their software vendor to understand this — and to build support structures accordingly.

### 1.2 SMB Segment (1–15 Technicians, $5K–$20K ARR)

**Profile:** Independent repair stations, single-location FBOs, owner-operated A&P shops. Budget-constrained. Technical sophistication varies from basic to moderate. Usually one person "in charge" of software.

**What they expect:**

| Dimension | SMB Expectation |
|---|---|
| **First response time** | Same business day (ideally under 4 hours). Next-day is acceptable for non-urgent issues. |
| **Channels** | Email is acceptable. Live chat is appreciated. Phone is rarely expected but reassuring. |
| **Weekend/holiday support** | Not typically expected unless specifically purchased. "Business hours" is the assumed baseline. |
| **Self-service** | Strong preference for searchable documentation and video tutorials. They want to solve problems without filing a ticket. |
| **Dedicated CSM** | Not expected at this ARR. A shared support inbox is sufficient. |
| **Onboarding** | Guided setup via video or documentation. Live onboarding call is a strong differentiator — most competitors at this tier offer no live onboarding. |

**What they fear:** The product disappearing, data loss, and not being able to reach anyone when something breaks. Transparency and responsiveness matter more than formal SLA language.

### 1.3 Mid-Market Segment (15–100 Technicians, $20K–$100K ARR)

**Profile:** Multi-location or high-volume repair stations, CAMO organizations, Part 145 operations with a dedicated operations or IT lead. Beginning to involve procurement and legal in vendor decisions.

**What they expect:**

| Dimension | Mid-Market Expectation |
|---|---|
| **First response time** | 2–4 hours for P1/P2 issues during business hours. Under 8 hours for standard issues. |
| **P1 definition** | System unavailable or data inaccessible — constitutes a business emergency. |
| **Channels** | Email + live chat as baseline. Phone or Slack Connect channel expected at this ARR. |
| **Weekend/weekend support** | For P1 issues (system down), at minimum an on-call contact. 24/7 P1 support expected by the upper end of this segment. |
| **Dedicated CSM** | Expected at $40K+ ARR — not necessarily dedicated to a single account but a named point of contact. |
| **Onboarding** | Live onboarding with milestone-based implementation plan. Training sessions for key users. |
| **QBRs** | Expected annually; more sophisticated buyers expect semi-annually. |

**What they fear:** Slow response on regulatory-critical issues, no named human to escalate to, unclear escalation path during incidents.

### 1.4 Enterprise / Multi-Site Segment ($100K+ ARR)

**Profile:** Large Part 145 operators, MRO subsidiaries of airlines or defense contractors, companies with formal IT governance, legal teams, and multi-year budgeting cycles.

**What they expect:**

| Dimension | Enterprise Expectation |
|---|---|
| **First response time — P1** | 1 hour or less, 24/7/365. |
| **First response time — P2** | 4 hours, business hours minimum. |
| **Resolution commitment** | P1: restore or workaround within 4 hours. P2: resolution plan within 24 hours. |
| **Channels** | Dedicated Slack/Teams channel, named CSM, executive sponsor, phone escalation. |
| **Dedicated CSM** | Required. Named individual with aviation/MRO domain knowledge preferred. |
| **QBRs** | Quarterly, structured agenda, documented outputs. Executive participation expected from both sides. |
| **Training programs** | Annual training credits, new user onboarding SLA, role-specific training libraries. |
| **Incident communication** | Real-time status page + proactive email communication during incidents. Post-incident report within 5 business days of resolution. |
| **Support SLA in contract** | Formal SLA schedule with defined credits/penalties as an exhibit to the MSA. |

**What they fear:** Startup insolvency, single-point-of-failure on support staff ("what happens when the one person who knows the system leaves?"), inability to reach anyone during a critical incident.

### 1.5 The Aviation Premium on Support Expectations

Across all segments, aviation MRO buyers apply an invisible multiplier to support expectations versus what the same company would expect from a general horizontal SaaS tool. The reasons:

- **Regulatory stakes.** An AOG event with a maintenance record dispute can trigger FAA scrutiny. Software failures that contribute to record-keeping gaps are not just operational problems.
- **Shift work.** Maintenance operations run 24/7, not 9–5. A critical issue at 2 AM on a Saturday is still a critical issue.
- **Small teams, single points of failure.** A five-person shop that cannot access the software has no redundancy. The entire operation stops.
- **Low trust baseline.** Aviation maintenance is a conservative industry. Software vendors are trusted slowly. Any support failure early in the relationship can end the contract.

**Athelon's implication:** Position support not as a cost center but as part of the compliance value proposition. "Our support team has domain knowledge in Part 145 operations" is a differentiator that AMOS and general CMMS vendors cannot credibly claim at the SMB tier.

---

## 2. SLA Requirements B2B Buyers Demand

### 2.1 The SLA Vocabulary Buyers Use

Buyers and their legal teams use specific terminology. Getting these right in contracts signals professionalism and reduces negotiation friction.

| Term | Definition | What Buyers Check |
|---|---|---|
| **Uptime SLA** | Percentage of time the service is available, measured monthly or annually | Is "uptime" defined? Does scheduled maintenance count? Is it per-component or whole-system? |
| **Response Time SLA** | Time from ticket submission to first substantive human response (not an auto-ack) | Is it calendar time or business hours? How is "substantive response" defined? |
| **Resolution Time SLA** | Time from ticket submission to verified issue resolution | What happens if the SLA is breached? Is there a credit? |
| **RTO (Recovery Time Objective)** | Maximum acceptable downtime before service is restored | Is there a defined disaster recovery RTO in the contract? |
| **RPO (Recovery Point Objective)** | Maximum acceptable data loss expressed as time (e.g., "no more than 4 hours of data loss") | What is the backup frequency? Is the RPO contractually committed? |

### 2.2 Uptime SLA Benchmarks by Segment

| Tier | Minimum Uptime Buyers Accept | What Strong Vendors Commit To |
|---|---|---|
| **SMB / starter** | 99.5% (3.65 days downtime/year) | 99.9% is now table stakes even at SMB |
| **Mid-market** | 99.9% (~8.7 hours/year) | 99.95% for production-critical apps |
| **Enterprise** | 99.95%–99.99% | 99.99% ("four nines") for mission-critical; penalty credits if breached |

**Key distinction buyers make:** Monthly uptime vs. annual uptime. A single 4-hour outage is fine if measured annually but can breach a monthly 99.9% SLA. Most enterprise buyers insist on monthly measurement.

**Scheduled maintenance:** Buyers increasingly require that scheduled maintenance windows not count against uptime SLA time only if: (a) the maintenance is announced at least 5 business days in advance, (b) it occurs outside peak business hours, and (c) it does not exceed a defined monthly cap (typically 4 hours).

### 2.3 Support Response Time SLA Benchmarks

Industry-standard support SLAs by priority tier, reflecting what mid-market and enterprise B2B buyers expect in 2025–2026:

| Priority | Definition | First Response (Business Hours) | First Response (24/7) | Resolution Target |
|---|---|---|---|---|
| **P1 — Critical** | Service unavailable; no workaround; business operations halted | 1 hour | 1 hour | 4 hours restore; 24 hours permanent fix |
| **P2 — High** | Major feature impaired; workaround exists but burdensome | 4 hours | 4 hours | 24 hours |
| **P3 — Medium** | Non-critical feature impaired; acceptable workaround available | 8 business hours | Next business day | 5 business days |
| **P4 — Low** | Cosmetic, documentation, minor UI issues, feature requests | 2 business days | 2 business days | Next release cycle |

**What buyers specifically negotiate:**
- Does "first response" mean a human responded or just an auto-acknowledgment? (Must be human.)
- Is the SLA clock paused while waiting for customer input? (Yes, standard — but buyers want it explicitly stated.)
- What constitutes a "workaround" for a P1 degrading to P2? (Must be defined.)
- What are the financial consequences of SLA breach? (Credits are expected at enterprise; the amount and cap matter.)

### 2.4 SLA Credit and Penalty Structures

**Standard industry approach:**

| Uptime Achieved (Monthly) | Service Credit |
|---|---|
| 99.9% – 99.95% | 5% of monthly fee |
| 99.5% – 99.9% | 10% of monthly fee |
| 99.0% – 99.5% | 15% of monthly fee |
| Below 99.0% | 25–30% of monthly fee |

**Support SLA breach credits:**

Most mid-market vendors offer a small credit (5–10% of a month's fee) per SLA breach incident, capped at one month's total fee per quarter. Enterprise buyers often negotiate these upward — 25–50% monthly fee cap, uncapped if breaches are systemic.

**What buyers actually want from penalty clauses:**
- The credit should be automatic (not requiring the customer to file a claim)
- The cumulative cap should be at least 30 days of fees
- Repeated SLA breaches (3+ in a quarter) should trigger a termination-for-cause right
- Credits should apply to the next invoice, not be paid in cash

**What early-stage vendors do wrong:** Offering credits that require the customer to file a claim within 30 days, capping total annual credits at one month's fee, and excluding "force majeure" broadly enough to cover almost any outage.

### 2.5 RTO and RPO Commitments

| Metric | SMB Acceptable | Mid-Market Expected | Enterprise Required |
|---|---|---|---|
| **RTO** | 24 hours | 4 hours | 1 hour for critical systems |
| **RPO** | 24 hours | 4 hours | 1 hour; continuous backup preferred |

**Convex's advantage for Athelon:** Convex provides automatic backups and point-in-time recovery. Athelon should commit to a contractual RPO of 4 hours (achievable given Convex infrastructure) and an RTO of 4 hours for non-P1 issues, 1 hour for total service unavailability affecting all customers. These commitments are defensible given the underlying infrastructure.

### 2.6 Aviation-Specific SLA Considerations

Part 145 operators face two scenarios that push SLA requirements above typical SaaS:

**AOG Hold Scenario:** An aircraft is on the ground, a work order cannot be completed or signed off due to software unavailability, and every hour costs the airline or operator money. At commercial aircraft rates, AOG costs range from $10,000 to $150,000+ per hour. A maintenance software vendor that cannot respond to a P1 within 1 hour for a commercial AOG situation will lose the contract.

**FAA Records Demand Scenario:** The FAA conducts a ramp inspection or investigation and requests maintenance records. The operator's software is down or the vendor is unresponsive. This creates direct regulatory exposure. Buyers at operators who handle commercial or charter operations will ask about this explicitly.

**Athelon's response:** Add "AOG Priority Support" as a feature of mid-tier and enterprise plans. Market it explicitly. Commit to a 30-minute P1 response for customers who declare an AOG event.

---

## 3. Vendor Viability Assessment — How Buyers Evaluate Startup Risk

### 3.1 The Buyer's Core Fear

Every procurement team evaluating a startup vendor is running the same mental calculation: "If this company ceases to operate in the next 18–36 months, what does that cost us?" For MRO software specifically, the cost includes:

1. **Migration cost** — Moving work order history, parts inventory, customer records, and compliance documentation to a new system
2. **Regulatory exposure** — FAA records inaccessibility during a transition gap
3. **Operational disruption** — Training staff on a new system mid-year
4. **Internal credibility loss** — The person who championed the vendor selection looks bad
5. **Sunk costs** — Implementation investment, custom configuration, workflow changes

The buyer's job is not to avoid risk but to manage it. A well-prepared startup that addresses each of these concerns directly can neutralize the objection.

### 3.2 The Vendor Viability Checklist Buyers Run

**Financial stability indicators (what they ask or research):**

| Question | What They Are Really Asking |
|---|---|
| "Are you funded? By whom?" | Will you be around in 24 months? Is there institutional money behind you or just a founder's savings account? |
| "What is your current ARR or revenue?" | Are you a real business or a pre-revenue experiment? |
| "How many customers do you have?" | Is anyone else betting on you? Can I talk to them? |
| "How long is your current runway?" | When might you be forced to make desperate decisions or shut down? |
| "What does your team look like?" | Is this a one-person band or a real organization? |
| "Do you have key-person risk?" | If the founder gets hit by a bus, does support continue? |

**What triggers immediate concern:**
- Cannot or will not answer funding/runway questions
- Fewer than 3 paying customers in the same segment as the prospect
- No full-time employees other than founders
- Founders with no industry domain knowledge
- No SOC 2 roadmap (for any deal above $25K ARR)
- Website looks unfinished; LinkedIn shows 1–2 employees
- No documented incident response plan

**What creates confidence (even at early stage):**
- Named institutional investors (even a small seed round from a known fund signals validation)
- Credible advisory board with aviation domain expertise
- 5–10 paying customers who will serve as references
- Clear SOC 2 roadmap with timeline
- Responsive, thoughtful answers to every diligence question
- Escrow agreement offered proactively (see Section 4)

### 3.3 Minimum Thresholds by Deal Size

Based on typical B2B procurement behavior, these are the minimum viability signals a startup needs to close deals at each ARR tier:

| Deal Size | Minimum Viability Signal |
|---|---|
| Under $10K/year | Product works; references not required; reasonable roadmap |
| $10K–$25K/year | 3–5 paying customers; responsive support; basic documentation |
| $25K–$50K/year | 5–10 customers; 2 available references; SOC 2 in progress; MSA available |
| $50K–$100K/year | 10+ customers; 3 references; SOC 2 Type I or II; named CSM; insurance (E&O) |
| $100K+/year | 15+ customers; enterprise reference available; SOC 2 Type II; signed BAA if applicable; source code escrow; named executive sponsor |

### 3.4 How Buyers Research Vendors Before the First Call

By the time a prospect joins a demo, they have already:

- **Checked LinkedIn** for founder backgrounds, team size, and hiring velocity
- **Searched for press** — funding announcements, product launches, industry coverage
- **Looked at G2, Capterra, or industry forums** for reviews (even zero reviews tells them something)
- **Checked the company's website** for customer logos, case studies, and "About" page credibility
- **Searched the founders' names** to see if they have aviation or MRO industry credibility
- **Checked Crunchbase or LinkedIn** for funding history

This means Athelon's digital footprint is part of its viability argument before any sales conversation begins. Neglecting this is leaving deals on the table.

### 3.5 The Aviation MRO Amplifier

Aviation maintenance buyers have additional reasons to be conservative about software vendor risk:

- **Records cannot be reconstituted.** If a software vendor goes out of business and records are lost, the FAA has no tolerance for gaps. An operator cannot simply say "our software vendor went bankrupt." The records obligation is theirs.
- **Audit trail destruction risk.** If an investigation begins after a vendor has shut down, the inability to produce records is not just embarrassing — it can trigger enforcement action.
- **Cultural conservatism.** The aviation maintenance industry selects for risk-aversion. The same instinct that makes a technician triple-check a torque value makes a DOM skeptical of unproven software.

---

## 4. Vendor Lock-In Concerns and Data Portability

### 4.1 What Buyers Mean by "Vendor Lock-In"

Lock-in concerns cluster into four categories:

1. **Data lock-in** — "Can I get my data out, in a usable format, if I leave?"
2. **Workflow lock-in** — "Have we built so many processes around this tool that switching is operationally catastrophic?"
3. **Contract lock-in** — "Am I trapped in a multi-year contract with no exit clause if the product fails?"
4. **Integration lock-in** — "Have we built so many integrations to this system that the switching cost is prohibitive?"

For MRO software, data lock-in is the dominant fear, specifically around:
- Work order history (FAA-required retention: 2 years minimum per 14 CFR §145.219)
- Airworthiness Directive compliance records
- Aircraft logbook entries and maintenance releases
- Parts and inventory history
- Customer and operator records

### 4.2 Data Export Requirements by Segment

| Segment | What Buyers Demand |
|---|---|
| **SMB** | "Can I export everything to CSV/Excel if I need to?" A yes is sufficient. |
| **Mid-market** | Full export in structured format (CSV + PDF of records). Export on demand, not requiring vendor assistance. Clear documentation of what is and is not included in an export. |
| **Enterprise** | Formal data portability clause in the MSA. Defined export format (CSV for structured data + PDF/XML for documents). Export SLA — data delivered within X business days of request. Post-termination data access window (30–90 days is standard). Destruction certificate upon confirmed data migration. |

### 4.3 Data Portability Contract Terms Buyers Require

Mid-market and enterprise legal teams look for these specific provisions:

**Required in the contract:**
- **Export on demand** — Customer can export all their data at any time, without requiring vendor assistance, in a portable format
- **Post-termination access** — Customer retains read-only access for a defined period (30–90 days) after contract end to complete data migration
- **No deletion before notice** — Vendor must provide at least 30 days' notice before deleting customer data after contract termination
- **Format commitment** — Data exported in standard formats (CSV, JSON, PDF) — not proprietary formats requiring the vendor's software to read
- **Completeness guarantee** — Export includes all customer-generated data, not just active records (deleted items, historical versions, audit logs)

**Red flags legal teams flag:**
- "We will provide data export upon written request within 60 business days" — too slow
- No post-termination data access period defined
- Export limited to "current" records only (excludes history)
- Data retention/deletion terms that favor the vendor
- No commitment to data format standards

### 4.4 Source Code Escrow (Enterprise Requirement)

Enterprise buyers and some mid-market buyers with critical operational dependency on software will require a **source code escrow agreement** as a condition of signing. This means:

- Athelon's source code is deposited with a neutral third-party escrow agent (e.g., Iron Mountain, Escrow London)
- The escrow agreement defines release triggers (typically: vendor bankruptcy, vendor ceases operations, vendor material breach uncured after 30 days)
- Upon a release trigger, the buyer receives a copy of the source code to maintain the software themselves

**Cost:** A basic escrow agreement costs $1,500–$3,000/year from Iron Mountain or similar providers.

**When it becomes a deal requirement:** Virtually any deal above $50K ARR with a procurement team. Be prepared to offer it rather than waiting to be asked — proactively offering escrow is a significant trust signal.

### 4.5 Contractual Exit Protections Buyers Negotiate

**Standard requests from mid-market and enterprise buyers:**
- Right to terminate for convenience with 30–90 days' notice (vs. being locked to contract end)
- Termination for cause trigger if SLA breaches recur (3+ P1 breaches in a quarter is common)
- Price protection clause — annual price increases capped (3–5% per year is industry standard)
- Termination for material breach with a cure period (30 days is standard)
- Right to terminate if the vendor is acquired by a direct competitor

---

## 5. Customer Success Programs That Reduce Churn

### 5.1 Why Customer Success Matters More in Vertical SaaS

In horizontal SaaS (email, CRM, project management), buyers have a broader mental model of the product category and can often self-onboard. In vertical SaaS serving a specialized industry like aviation MRO, buyers are usually experts in their domain (aircraft maintenance) but not in software adoption. The learning curve is steep. The cost of failed adoption is high — they revert to paper, the product gets abandoned, and the vendor gets churned.

Net Revenue Retention (NRR) is the primary health metric for SaaS companies. Industry benchmarks:
- Median NRR for B2B SaaS: approximately 106% (customers expand more than they churn)
- Top-quartile performance: 120%+
- Churn risk threshold: NRR below 100% signals that expansion does not offset departures

For a vertical SaaS startup, NRR above 110% is the proof point that unlocks Series A narratives.

### 5.2 The Customer Success Tier Model

**Tier 1 — Digital/Self-Serve (SMB, sub-$15K ARR)**

- Automated onboarding sequences (email + in-app)
- Documentation library with search
- Video tutorial series covering core workflows
- In-app tooltips and contextual help
- Monthly product update emails
- Community forum or Slack community
- Annual NPS survey

**Tier 2 — Managed Success (Mid-Market, $15K–$75K ARR)**

- Named CSM (shared; one CSM handles 20–40 accounts)
- Live onboarding call within 5 business days of signing
- 30/60/90 day check-in cadence
- Semi-annual QBR (Quarterly Business Review — despite the name, often done twice a year at this tier)
- Custom health score monitoring with proactive outreach at health score decline
- Usage reporting shared with customer (are they actually using the features they paid for?)
- Product feedback sessions — CSM facilitates feature requests back to the product team

**Tier 3 — Strategic Success (Enterprise, $75K+ ARR)**

- Dedicated CSM with aviation domain knowledge
- Executive sponsor at the vendor (founder or VP-level)
- Quarterly Business Reviews with structured agenda and documented action items
- Custom onboarding plan with named milestones and go-live date
- Annual health review including compliance posture assessment
- Priority product roadmap input — named enterprise customers get a seat at the table
- Proactive monitoring and alert on leading churn indicators (declining logins, support ticket spikes, champion departure)

### 5.3 The QBR Framework for MRO SaaS

A QBR that does not speak the customer's language is a waste of everyone's time. For aviation MRO, the right QBR agenda:

**Pre-QBR prep (internal, 1 week before):**
- Pull usage data: logins/week, work orders created, parts tracked, documents uploaded
- Review support ticket history: volume, severity, resolution times
- Flag any champion changes at the account (new DOM, new GM)
- Review renewal date and ARR at risk

**QBR Agenda — 60 minutes:**
1. **What got done (10 min)** — Key milestones achieved since last QBR. Work orders processed, inspections completed, AD items tracked. Quantify where possible ("you tracked 47 AD compliance items this quarter that previously lived in a spreadsheet").
2. **Health check (10 min)** — Usage trends, adoption by role (are all technicians using it or just two?), support history (any recurring issues?).
3. **Your operational priorities (20 min)** — What matters to them in the next quarter? Upcoming inspections? Fleet expansion? New regulatory requirements? This is listening time, not presenting time.
4. **Product roadmap alignment (10 min)** — What is shipping in the next quarter that matters to their operation? How does it address what they just told you?
5. **Open issues and commitments (5 min)** — Anything unresolved from last QBR? New action items with owners and due dates.
6. **Commercial (5 min)** — Renewal status, expansion opportunities (additional users, new modules). Only if the relationship is in good standing.

**The QBR mistake most early-stage founders make:** Turning the QBR into a product demo or roadmap pitch. The QBR is for the customer's benefit, not the vendor's. Customers who leave a QBR feeling heard and valued have dramatically lower churn rates than those who leave feeling sold to.

### 5.4 Health Score Design for MRO SaaS

A health score is a single composite metric (typically 0–100) that tells the CSM which accounts are at risk before the customer cancels. Effective MRO SaaS health scores weight these inputs:

| Signal | Weight | Why It Matters |
|---|---|---|
| **Login frequency** (weekly actives / licensed seats) | 25% | Adoption. Seats that go dark signal the product is not being used. |
| **Work order volume** (WOs created this period vs. baseline) | 20% | Workflow adoption. If they stopped creating work orders, they reverted to paper. |
| **Last login by primary admin** | 15% | Champion health. If the DOM hasn't logged in for 3 weeks, something changed. |
| **Support ticket volume** (rolling 30 days) | 15% | Friction signal. Spike in tickets = unresolved pain. |
| **Renewal date proximity** | 10% | Risk window. Accounts within 90 days of renewal with declining signals need intervention. |
| **Feature breadth** (# of distinct features used) | 10% | Stickiness. Customers using 1 feature are easier to churn than customers using 5. |
| **NPS or satisfaction survey score** | 5% | Sentiment. Low NPS with no outreach is a churn warning. |

**Threshold actions:**
- 80–100: Healthy. Quarterly check-in.
- 60–79: Monitor. CSM proactive outreach within 2 weeks.
- 40–59: At risk. CSM + executive sponsor contact within 5 business days. Root cause analysis.
- Below 40: Critical. Retention playbook activated. Leadership involved.

### 5.5 Proactive Outreach Templates That Work in Aviation MRO

The most effective proactive outreach is relevant, not generic. Avoid "Hi, just checking in!" emails. Instead:

- "Your annual inspection season is 6 weeks out — here's how to use Athelon's AD compliance tracker to prepare." (Relevant to their operational calendar.)
- "We noticed you haven't used the document attachment feature — here's a 3-minute video showing how three similar shops eliminated 90% of their paper file scanning using it." (Adoption gap + social proof.)
- "FAA published AD 2026-XX-YY affecting [aircraft type]. We flagged it in your fleet — log in to see which aircraft are affected." (Regulatory relevance — extremely high engagement.)

---

## 6. Reference and Social Proof Requirements

### 6.1 How Many References Buyers Expect

| Deal Size | References Expected | Timing |
|---|---|---|
| Under $10K | 0–1; logo on website sufficient | Optional |
| $10K–$25K | 1–2; willing to provide on request | During evaluation |
| $25K–$75K | 2–3; scheduled reference calls | Formal evaluation stage |
| $75K–$150K | 3–4; including 1 in same segment | Before legal review |
| $150K+ | 4–5; including 1 executive reference; 1 technical reference; 1 similar use-case reference | Before contract |

**What buyers do on reference calls (that vendors do not expect):**
- They ask how responsive the vendor is when things go wrong, not just when things go right
- They ask whether the vendor's roadmap commitments were honored
- They ask whether the buyer would sign the same contract again today
- They probe on data quality and record accuracy ("have you ever had a compliance issue related to the software?")
- They ask whether the reference would refer a peer company to the vendor

**The most valuable reference profile for Athelon:**
A Director of Maintenance or Chief Inspector at a Part 145 repair station with 10–50 technicians who was previously on paper or Excel, who can speak to FAA audit confidence since adopting Athelon.

### 6.2 What a Reference Call Script Looks Like

Buyers who ask the right questions ask these:

1. "What made you choose [vendor] over alternatives?"
2. "How long did implementation take vs. what you were told?"
3. "Describe the last time you had a serious problem with the software — how did the vendor respond?"
4. "Would you sign the same contract today? Would you change any terms?"
5. "Are there any features or workflows that don't work the way the vendor said they would?"
6. "What do you wish you had known before signing?"
7. "Would you refer a peer to this vendor?"

**What this means for Athelon:** Prepare your reference customers for these questions. Brief them before reference calls. Customers who are surprised by a tough question give uncertain answers that undermine the deal.

### 6.3 Case Study Requirements by Segment

**SMB:** Logo on the website is sufficient. A 150-word quote on the website with the customer's title and company type ("5-person Part 145 repair station in Texas") is meaningfully better than no case study.

**Mid-market:** A 500–800 word written case study with:
- Customer profile (size, location, operation type)
- The problem they had before Athelon
- The specific workflows they use (not generic "improved efficiency")
- Quantified outcomes where possible ("reduced time to close a work order by 60%")
- A named quote from the DOM or GM

**Enterprise:** A 1,000–1,500 word PDF case study, optionally with a video testimonial, that covers:
- Business context (fleet size, throughput, regulatory environment)
- Evaluation and selection process (why Athelon vs. alternatives)
- Implementation timeline and any challenges
- Outcomes with specific metrics (utilization, compliance rate, audit outcomes)
- Named executive sponsor quote

### 6.4 G2 and Capterra — Why Reviews Matter for B2B SaaS

G2 and Capterra are consulted by 60–70% of B2B software buyers during initial research, before they contact a vendor. A product with zero reviews on G2 looks unproven. A product with 3–5 reviews with average rating 4.5+ looks credible. A product with 15+ reviews is legitimized.

**The review gap is asymmetric:** A startup with 5 excellent reviews can outperform an established competitor with 50 mixed reviews if the 5 reviews are specific, detailed, and relevant to the prospect's use case.

**How to get early reviews legitimately:**
- Ask beta customers and early design partners directly — most are happy to help if the product is working
- Time the review request to a success moment (right after they clear an FAA audit, right after a successful busy season)
- Never incentivize reviews with discounts — G2 and Capterra prohibit this and buyers are suspicious of review clusters

**Target for first year:** 5–10 G2 reviews, 4.5+ average rating, with at least 2 reviews mentioning FAA compliance or Part 145 specifically.

### 6.5 Industry Credibility Signals Unique to Aviation MRO

In addition to standard SaaS social proof, aviation MRO buyers respond to:

- **ARSA (Aeronautical Repair Station Association) membership or event presence** — Signals that the vendor is a legitimate industry participant
- **Aviation Week MRO coverage** — Being quoted in or covered by industry trade press is significant social proof
- **FAA Advisory Circular or regulatory guidance alignment** — Referencing specific ACs in marketing shows regulatory literacy
- **Partnerships with aviation supply chain players** — Integration partnerships with ILS, PartsBase, or Inventory Locator Service signal operational relevance
- **Presence at MRO events** (MRO Americas, Heli-Expo, NBAA-BACE) — Industry conference presence signals commitment

---

## 7. Contract and Procurement — Terms, Structure, Red Flags

### 7.1 Standard B2B SaaS Contract Architecture

B2B SaaS contracts at mid-market and enterprise scale use a two-document structure:

**Master Services Agreement (MSA):** The foundational legal document covering the entire relationship. Contains:
- Definitions
- License grant and scope of use
- Data ownership and processing terms
- Confidentiality obligations
- Limitation of liability
- Indemnification provisions
- IP ownership
- Dispute resolution and governing law
- Termination conditions and consequences

The MSA is negotiated once and governs all future business.

**Order Form:** The commercial document executed per transaction. References the MSA and contains:
- Specific product/service purchased
- Number of seats/users
- Subscription term
- Pricing and payment terms
- Start date and renewal terms
- Any custom SLA exhibits or amendments

**SLA Schedule / Exhibit A:** Attached to the MSA or Order Form, defining uptime commitments, response time commitments, credit/penalty structure, and exclusions.

### 7.2 Red Flags That Legal Teams Flag Immediately

These terms cause legal reviews to stall deals or result in rejection. Athelon must not include these in its standard template:

**High-severity red flags (deal stoppers):**
- **Unilateral price change right** — "Vendor may adjust pricing with 30 days' notice" without a cap is rejected by every sophisticated buyer
- **Broad IP assignment** — Language that could be read as the vendor claiming ownership of customer data or customer configurations
- **Limitation of liability below 12 months of fees** — Standard in the industry is 12 months; below this signals a vendor who does not stand behind the product
- **Exclusion of consequential damages with no carve-outs** — Buyers expect carve-outs for confidentiality breaches, IP indemnification, and data breaches
- **Auto-renewal with no notice period** — Auto-renewal is fine; requiring 60–90 days' notice to cancel before auto-renewal without clearly communicating this is a legal red flag

**Medium-severity flags (negotiated, slow the deal):**
- No explicit data ownership statement ("Customer owns all Customer Data" should be explicit)
- Vague definitions of "confidential information" that could expose the customer's maintenance data
- No DPA (Data Processing Agreement) for customers subject to GDPR or CCPA
- Governed by an inconvenient state law without flexibility (e.g., "governed by the laws of [state] without regard to conflicts of law" is standard; an unusual jurisdiction creates unnecessary friction)
- Support SLA that requires customer to request credits rather than automatic application

### 7.3 Terms Athelon Should Include Proactively

Including these terms in the standard template signals maturity and reduces negotiation friction:

```
✓ Explicit data ownership: "All Customer Data is and remains the exclusive property of Customer."
✓ Data portability: "Vendor will provide Customer with a complete export of Customer Data
  within 5 business days of request, in CSV format for structured data and PDF for documents."
✓ Post-termination access: "Customer will have read-only access to Customer Data for 30 days
  following contract termination."
✓ Price protection: "Annual price increases will not exceed 5% per year without 60 days' notice."
✓ SLA credits automatic: "Credits will be applied automatically to the following invoice."
✓ Termination for cause: "Either party may terminate for material breach uncured within 30 days
  of written notice."
✓ Escrow: "Source code escrow agreement available upon request."
```

### 7.4 Procurement Process Timing Realities

Understanding the buying timeline prevents forecasting errors and chasing dead deals:

| Segment | Typical Sales Cycle | Who Is Involved |
|---|---|---|
| **SMB (sub-$15K)** | 2–6 weeks from demo to signature | 1 decision maker (owner/DOM). No legal review. Credit card or check. |
| **Mid-market ($15K–$75K)** | 6–16 weeks | DOM + operations + accounting. Sometimes legal review if IT is involved. ACH or wire. |
| **Enterprise ($75K+)** | 3–9 months | 5–12 stakeholders. Legal review standard. Procurement/vendor management involvement. Security questionnaire. Purchase order. |

**Where deals die in each segment:**

- SMB: They go quiet after the demo (overwhelmed by other priorities). Follow up systematically.
- Mid-market: Legal takes 4–6 weeks to review the contract and nobody is managing the process. Assign a champion and give them a redline template to accelerate.
- Enterprise: Security questionnaire is not answered fast enough. Procurement needs a vendor questionnaire response. Finance needs a SOC 2 report. Nobody is driving internal coordination. Assign an executive sponsor on both sides.

### 7.5 The MSA Negotiation Playbook for Early-Stage Founders

**Do not negotiate every term.** Enterprise buyers expect push-back on commercially aggressive requests, but founders who negotiate every clause signal inexperience and consume their own time.

**Accept without negotiation:**
- Reasonable mutual NDA/confidentiality terms
- Standard indemnification for IP infringement
- Governing law in buyer's state (avoid making this a battle)

**Negotiate but concede quickly:**
- Liability cap above 12 months (offer 12 months; accept up to 18 months if pressed)
- Notice periods for termination (offer 30 days; accept up to 60 days)

**Hold the line:**
- Customer data ownership (non-negotiable — you never own their maintenance records)
- No right for vendor to use customer data for training AI models without explicit consent
- SLA credit structure (do not remove credits entirely)

**Offer proactively to close deals faster:**
- Source code escrow for enterprise accounts
- Custom SLA schedules for accounts with AOG risk
- Data Processing Agreement (DPA) addendum for any customer with GDPR exposure

---

## 8. The Athelon Playbook — Competing on Trust Against Established Vendors

### 8.1 The Core Reframe: "Startup Risk" Is a Surface, Not a Verdict

When a mid-market buyer says "we're worried about vendor viability," they are not saying "we refuse to buy from a startup." They are saying "I need help building the internal case that this risk is managed." Your job is to give them the tools to make that case to their leadership.

Established competitors like CORRIDOR, Smart145, or AMOS win on inertia and brand recognition, not on product quality. Many of them have:
- Older, less flexible codebases
- No mobile experience
- Poor API documentation
- Slow support queues
- Account executives who do not know the product deeply

Athelon's opportunity is to be a vendor that a champion at a mid-market operator *wants* to fight for internally — because the product is genuinely better and the founder will personally call them back within an hour.

### 8.2 The Trust Playbook — Concrete Actions by Priority

**Immediate (before next enterprise sales call):**

1. **Publish a Trust Page** (`athelon.com/trust` or equivalent). Include: infrastructure provider certifications (Convex SOC 2, Vercel SOC 2, Clerk), your SOC 2 roadmap with target dates, your uptime SLA commitment, a link to your status page, and your data portability policy. This single page answers 40% of vendor viability questions before they are asked.

2. **Create a live status page** (statuspage.io or BetterUptime — $20–$50/month). Display real-time uptime for the last 90 days. A startup with 99.97% uptime shown on a live status page is more credible than an established vendor with no transparency.

3. **Draft your standard MSA template** with the proactive terms from Section 7.3. Have it reviewed by a SaaS-experienced attorney once. Cost: $2,000–$4,000. Return: eliminates 70% of legal friction in mid-market deals.

4. **Prepare a Vendor Security Questionnaire (VSQ) response document.** Most enterprise procurement teams use a standardized VSQ (some use SIG, some use custom). Pre-filling a standard VSQ response document means you can respond to questionnaires in hours, not weeks. Speed of response to security questions is itself a trust signal.

**Within 90 days:**

5. **File for SOC 2 Type I.** Engage a compliance automation platform (Vanta, Drata, or Secureframe — approximately $8,000–$15,000/year). Type I can be achieved in 8–12 weeks. Type I is sufficient to unblock most mid-market deals. Type II (requires 6-month observation period) is the enterprise standard.

6. **Set up source code escrow.** Iron Mountain EscrowTech: approximately $1,500–$2,000/year for a basic single-beneficiary agreement. Offer this proactively to any deal above $50K ARR.

7. **Establish the Athelon Customer Advisory Board (CAB).** Invite your first 5–8 customers to a CAB. Meet quarterly. Share roadmap. Gather input. The CAB has two purposes: product feedback, and social proof. A prospect who asks "do you have customers I can talk to?" and you say "we have an 8-member Customer Advisory Board of Part 145 operators — I'll connect you with two" sounds very different from "we have a few customers who sometimes take calls."

8. **Get 5 G2 reviews.** Personally email your best customers and ask for a review. Draft a template they can edit. A 5-star review that says "Athelon helped us pass our FAA audit last quarter" is worth more than ten generic reviews.

**Within 6 months:**

9. **Publish 2–3 written case studies.** Focus on FAA audit outcomes, AD compliance, and time-to-close for work orders. These are the metrics MRO buyers care about.

10. **Get an independent penetration test.** Cost: $5,000–$15,000 for a basic SaaS pen test from a reputable firm. The attestation letter you receive is a standard deliverable in enterprise security questionnaires.

11. **Join ARSA** (Aeronautical Repair Station Association). Annual membership: approximately $500–$1,000. Attend one event. Being an ARSA member is a credibility signal that Athelon is a committed industry participant, not a tech outsider trying to parachute into aviation.

12. **Establish aviation advisory board.** Recruit 2–3 FAA-experienced advisors (retired FAA inspectors, former DOMs at Part 145 operators, aviation attorneys). Small equity grants (0.1–0.25% each) are standard. An advisory board that includes someone who spent 20 years at the FAA is a differentiated trust signal that no amount of marketing budget can replace.

### 8.3 How to Handle "You're a Startup" Directly in Sales Conversations

When the objection is raised (and it will be), do not become defensive. Run this frame:

**Step 1: Acknowledge and validate.**
"You're right to think about this — your FAA maintenance records are critical, and you need confidence that they'll be accessible regardless of what happens with any software vendor."

**Step 2: Reframe the risk comparison.**
"The question isn't startup vs. established vendor — it's which vendor has done more to protect you. Established vendors have gone out of business, been acquired and abandoned, and experienced data loss. The question is: what protections are in the contract?"

**Step 3: Present the concrete safeguards.**
- Data portability: "Your data exports in CSV format on demand, at any time. You are not dependent on us to access your own records."
- Post-termination window: "If we ever ceased operations, you have 90 days of read-only access to migrate everything."
- Source code escrow: "We offer source code escrow through Iron Mountain so you could maintain the software yourself if we were ever unable to."
- Infrastructure: "Your data runs on Convex, which is backed by institutional investors and runs on AWS. Even if Athelon ceased to exist, the infrastructure provider's data retention practices apply."

**Step 4: Invert the question.**
"What would need to be true for you to feel comfortable that this risk is managed? Tell me specifically and I'll either show you we've already addressed it or commit to a contractual term that does."

This last question turns the objection into a requirements conversation. Almost always, the buyer has a specific concern (usually: "can I get my records out?") that is solvable with a contract clause.

### 8.4 The "Startup Premium" Offering — What Only a Startup Can Do

Established vendors cannot offer these things because of their scale and internal bureaucracy. These are genuine competitive advantages:

- **Founder responsiveness.** A VP of Sales at a 200-person MRO software company does not return calls from a 12-technician repair station. A founder does. "You will have my cell phone number" is not a gimmick — it is a meaningful support commitment that established vendors structurally cannot match.
- **Roadmap influence.** A 12-person shop that tells Impresa MRO they want a QuickBooks integration gets added to a backlog. The same shop telling Athelon's founder gets it built in 6 weeks and owns the bragging rights. Customer-driven roadmap is a feature.
- **Tailored implementation.** Enterprise vendors send a project manager and a three-month implementation timeline. Athelon's founder can join a customer's team on day one, watch how they work, and build workflows specific to their operation. This is unprecedented white-glove service that no established vendor provides at any price.
- **Real SLAs with real teeth.** Established vendors negotiate SLAs and then fight every credit claim. An early-stage founder who stands behind their commitments absolutely — automatically applying credits, personally calling during incidents — builds trust that survives the entire customer lifetime.

### 8.5 Summary: The Trust Building Roadmap

| Quarter | Priority Action | Unlocks |
|---|---|---|
| **Q1** | Trust page + status page + MSA template | Mid-market deals; reduces legal friction |
| **Q1** | 5 G2 reviews + 2 reference customers ready | Evaluation stage credibility |
| **Q2** | SOC 2 Type I filed (Vanta/Drata) | Unblocks $50K+ ARR deals |
| **Q2** | Source code escrow agreement | Unblocks $50K+ enterprise requirement |
| **Q2** | Pen test + attestation letter | Clears security questionnaire gate |
| **Q3** | SOC 2 Type II observation period begins | Timeline to enterprise compliance |
| **Q3** | First 2 written case studies published | Evaluation acceleration |
| **Q3** | ARSA membership + first aviation advisory board members | Industry credibility |
| **Q4** | Customer Advisory Board launched (6–8 members) | Reference velocity; product quality |
| **Year 2** | SOC 2 Type II certification | Enterprise gate opens fully |

---

## Appendix A: SLA Template Language for Athelon's MSA

The following language is starting-point guidance for Athelon's counsel. It represents standard industry practice and should be reviewed by a SaaS-experienced attorney before use in binding contracts.

```
EXHIBIT A — SERVICE LEVEL AGREEMENT

1. UPTIME COMMITMENT
Vendor commits to 99.9% Monthly Uptime for the Athelon platform, measured as:
  (Total minutes in month - Downtime minutes) / Total minutes in month × 100

"Downtime" means the platform is unavailable for all users for more than 5 consecutive minutes.
Scheduled maintenance with 5 business days' notice, not exceeding 4 hours per month between
the hours of 10 PM and 6 AM local time of the Customer's primary location, does not count
as Downtime.

2. SUPPORT RESPONSE TIME COMMITMENTS
  P1 (Service Unavailable): First human response within 1 hour, 24/7/365.
  P2 (Major Feature Impaired): First human response within 4 business hours.
  P3 (Non-Critical Issue): First human response within 8 business hours.
  P4 (Minor/Cosmetic): First human response within 2 business days.

3. SERVICE CREDITS
If Vendor fails to meet the Uptime Commitment in any calendar month, Customer is eligible for
Service Credits as follows:
  99.5% – 99.9%: Credit equal to 5% of monthly subscription fee
  99.0% – 99.5%: Credit equal to 10% of monthly subscription fee
  Below 99.0%: Credit equal to 25% of monthly subscription fee

Credits are applied automatically to the following invoice. Total annual credits are capped
at 30 days of Customer's monthly subscription fee.

4. DATA PORTABILITY
Upon Customer's request, Vendor will provide a complete export of Customer Data within 5
business days. Customer retains read-only access to Customer Data for 30 days following
contract termination.
```

---

## Appendix B: Vendor Viability Due Diligence Response Template

When a prospect's procurement team sends a vendor viability questionnaire, respond to each item with prepared answers. The following table is the starting framework:

| Question | Athelon Response Approach |
|---|---|
| "How long has the company been in operation?" | State founding date and milestone history (first customer, first $X ARR, team growth). |
| "How many paying customers do you have?" | State actual count. If under 20, add segment context ("all of whom are FAA Part 145 certificated repair stations"). |
| "What is your current ARR?" | Disclose to qualified enterprise prospects under NDA. Refusing to answer signals weakness more than disclosing a small number. |
| "Are you funded? By whom?" | Disclose investors by name (even angels) and total raised. If bootstrapped, say so with confidence — "profitably bootstrapped, no external funding dependency" is a valid frame. |
| "What is your current runway?" | Give a range ("more than 18 months") without disclosing exact financial position. If raising, say so. |
| "Do you have E&O / cyber liability insurance?" | Yes — obtain this before enterprise sales. Approximate cost: $2,000–$5,000/year for $1M/$2M cyber liability policy. |
| "Who are your subprocessors?" | List Convex, Clerk, Vercel, and any other services that touch customer data. This is required for GDPR/CCPA. |
| "What is your SOC 2 status?" | Honest answer + roadmap. If pre-SOC 2: "We are in the process of achieving SOC 2 Type II certification with a target completion of [date]. We have achieved SOC 2 Type II via our infrastructure providers [list]. Our own Vanta audit is underway." |

---

*This document is part of the Athelon B2B Buyer Evaluation research corpus. Related documents: 01-security-compliance-trust.md, 02-pricing-roi-tco.md, 03-integration-technical-evaluation.md, 06-buying-process-decision-framework.md*
