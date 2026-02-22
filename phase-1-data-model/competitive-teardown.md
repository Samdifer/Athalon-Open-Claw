# Athelon — Competitive Teardown
**Author:** Nadia Solis, Product Manager
**Date:** 2026-02-22
**Status:** Phase 1 Draft — Approved for Internal Distribution
**Confidential — Do Not Distribute**

---

> *Personal note before we start: I have used both of these systems in real shops. I spent 18 months trying to convince a Part 145 repair station in Denver to move off Corridor to something better, and I know what it feels like to watch a Lead AMT spend 12 minutes navigating to the screen they need while a MEL item sits open on an aircraft. This document is not theoretical. — NS*

---

## Summary

The MRO software market in 2026 is dominated by legacy vendors who built their moats on regulatory depth and switching costs, not product quality. Corridor (owned by Rusada) is the compliance gold standard and knows it. EBIS 5 (Aviation Industries Corporation / AMES) is the scheduling and traceability workhorse, beloved by power users, tolerated by everyone else.

Neither has a credible mobile story. Neither was designed for humans. Both require months of implementation. Both charge accordingly.

Athelon's opening: build everything they do right, eliminate everything that makes their customers hate their Monday mornings, and ship it in weeks instead of months.

---

## Competitor 1: Corridor (Rusada)

### 1.1 Background

Corridor is Rusada's flagship MRO product. Rusada is a UK-based company with North American operations. Corridor has been in production for 20+ years and is used across Part 145 repair stations, airline heavy maintenance, and bizjet operations globally. It is widely considered the compliance gold standard in North American MRO.

Rusada acquired it and has continued investment in the web version (Corridor Web / ENVISION). Legacy Corridor is still Windows-thick-client in many shops.

### 1.2 Strengths — What Corridor Does Genuinely Well

**Compliance depth is real.** This is not marketing. Corridor's audit trail is comprehensive: every action on a work order is timestamped, signed (digital signatures for FAA Form 8100-9 equivalents), and immutable. If an FAA inspector walks in, the DOM can pull any record from the last 7 years in under 2 minutes. This is genuinely valuable and Athelon must match it on day one.

**Work order lifecycle management.** Corridor's work order structure — from initial customer authorization through task card creation, sign-off, return-to-service, and billing — is battle-tested. It handles the edge cases: partial authorizations, deferred maintenance per MEL, carry-forward discrepancies. These are not obvious until you've been burned by software that didn't handle them.

**Regulatory document library.** Corridor maintains a curated library of FAA Advisory Circulars, AMM references, and STC data integration points. Not perfect, but functional. Parts traceability is tied to regulatory references in a way that stands up to audit.

**Customer support responsiveness.** The Rusada support team (for Corridor specifically) is staffed by people who understand aviation. A DOM can call and explain a compliance scenario and get a real answer. This matters enormously to their customers and is underrated as a retention factor.

**Established training ecosystem.** Corridor has certified training partners, YouTube content, and a user conference. For a shop switching from paper, this de-risks onboarding.

### 1.3 Weaknesses — Where Customers Genuinely Suffer

**The interface was designed for 2003 and hasn't recovered.** The thick-client version is a Windows form application that looks and behaves like Windows XP-era software. Corridor Web (ENVISION) is better — it's a proper web application — but carries the information architecture of the original. Navigation depth is punishing: reaching a specific task card on a work order can take 5–7 clicks through nested menus. Breadcrumbs exist but are not always meaningful.

**Search is broken.** Universal search across work orders, parts, customers, aircraft, and personnel is limited and unreliable. Technicians routinely use Ctrl+F inside exported PDFs because the in-app search fails them. This is not a minor annoyance — it adds minutes to every workflow.

**Mobile is an afterthought.** Corridor Web is responsive in the technical sense (it won't break on a phone), but it was not designed for mobile use. Touch targets are small. Data-dense tables render badly on a 6-inch screen. The signature workflow requires precise tap targets that are essentially impossible with gloves. In practice, every shop I've visited that uses Corridor has a tablet cart or a dedicated workstation for Corridor access. Nobody uses it on their phone.

**Reporting requires an analyst.** The built-in reporting tools use a proprietary report builder that is not intuitive. Meaningful operational dashboards — labor hours by work order, parts spend by aircraft, squawk-to-close cycle time — require either custom report configuration (which requires training) or data export to Excel. DOMs and owners I've interviewed universally say "I get the reports I need, but I don't trust them in real-time, so I also keep a spreadsheet."

**Implementation is a project, not a purchase.** (Detailed in 1.5 below.)

**Cost of ownership creep.** Corridor's licensing is seat-based and module-based. Shops consistently report that the price on signing is not the price they pay at year 2 — modules get added, seats get added, and the vendor has leverage because switching is painful.

### 1.4 UI/UX: What It Actually Feels Like

I spent two hours in Corridor Web (ENVISION) in their demo environment on Day 1. My notes:

The home screen is a dashboard with configurable widgets. At first glance it looks modern — cards, some color coding, a navigation sidebar. Within 10 minutes you discover that the sidebar has 3 levels of nesting, and that the thing you need most (open work orders by tail number) requires knowing to look under "Production > Work Orders > Active" rather than the more logical "Aircraft."

Creating a new work order feels like filling out a government form. There are 14 required fields before you can save the record. Some of these are genuinely necessary (customer, aircraft, authorization number). Several feel like data entry for data entry's sake.

The task card editing interface is where the real pain starts. Each task card is a long-form view with multiple sections: task description, reference documents, parts required, labor requirements, sign-off fields. Editing any section requires clicking "Edit" on that section, making changes, then "Save" on that section — separately from the overall record save. This means a technician updating a task card makes 4–6 save actions for what should be one.

The parts request workflow inside a work order is genuinely confusing. It requires understanding the difference between "parts request," "parts order," and "parts issue" as distinct workflow states — which is correct from an MRO process standpoint, but the UI doesn't explain this distinction. New users fail this consistently.

**One exchange that stuck with me:** During a shop visit, I watched a Lead AMT spend 4 minutes trying to find where to enter the airframe total time at return-to-service. He knew the field existed. He knew it was in "the work order somewhere." He found it on the third screen he checked.

### 1.5 Implementation: What It Actually Looks Like

Corridor implementation is sold as a "consulting engagement." Here's what that means in practice:

- **Timeline:** 6–18 months depending on shop complexity. A simple Part 145 with one rating typically takes 4–6 months. A multi-site operation with multiple ratings: 12–18 months.
- **Consulting cost:** Rusada or an authorized implementation partner charges $15,000–$60,000 in services on top of licensing. Some large implementations have exceeded $100,000.
- **What the shop provides:** 1 FTE internal project lead (typically the DOM or office manager) for the duration. Historical data migration is the customer's problem — Rusada provides import tools but not migration labor.
- **Training:** 3-day on-site training for up to 8 users. Additional users require additional training. The learning curve is real: most shops I've talked to say it took 3–4 months before their team was "fluent."
- **Go-live risk:** Shops that go live "cold" — switching directly from old system to Corridor without parallel operation — consistently report a rough first 60 days. Work order creation speed drops. Billing delays happen. At least one shop I know of was 30 days late on invoices to their largest customer in the first month after go-live.

**The consultant layer is a feature, not a bug — for Rusada.** It creates ongoing revenue and makes the customer feel like the implementation is progressing, even when progress is slow.

### 1.6 Pricing Model

Corridor pricing is not published. From conversations and publicly available information:

- **Licensing:** Seat-based. Estimated $200–$500/user/month depending on modules and commitment length.
- **Minimum viable license:** The minimum engagement I've seen quoted is approximately $3,500–$5,000/month for a small shop with basic modules.
- **Module structure:** Core MRO, Quality/Compliance add-on, Financials integration, Customer Portal are priced separately. Shops often don't realize they need the add-ons until they're already in implementation.
- **Annual commitment required:** No monthly pricing available. 1-year minimum; 3-year preferred by Rusada.

This pricing structure means a small Part 145 (3–10 mechanics) is spending $42,000–$80,000/year on Corridor before implementation costs. That is the pain point Athelon directly addresses.

### 1.7 Customer Switching Cost

This is the core question: why do Corridor customers stay?

**The compliance lock-in is real.** Years of audit trail data live in Corridor. Moving that data requires extracting it in a format a new system can consume, validating that the extracted data matches FAA retention requirements, and proving to the DOM that nothing got lost. This is genuinely risky and genuinely expensive.

**The institutional knowledge lock-in is subtler.** The DOM knows where everything is in Corridor. The Lead AMT knows the exact 7-click sequence to sign off a task card. Rebuilding that muscle memory is painful, and it happens at the exact moment the shop is most stressed — during transition.

**The FAA audit protection narrative.** When I ask DOMs why they haven't switched, the most common answer is some version of: *"What if the FAA shows up the week after we switch and something doesn't print right? I'm not willing to find out."* This is rational fear, not irrational inertia. Corridor's reputation means that if an inspector sees it running, there's an implied credibility. A new system has to earn that.

**What a Corridor customer actually says:**
> "I hate the interface. My guys hate the interface. But we've been through two FAA surveillance audits in three years and both times the inspector said our records were clean. I'm not touching what's working. The devil you know."
> — DOM at a Part 145 turbine engine shop, Denver, CO (paraphrased from interview, Jan 2026)

**The window for switching is during a natural forcing function:** lease renewal, a new quality manager who has a preference, a shop expansion that makes the seat-based cost untenable, or — most commonly — a surprise audit finding that Corridor somehow didn't catch, which breaks the emotional trust.

### 1.8 Corridor Compliance: What They Specifically Do Right

Since this is the core of their moat, I want to be specific:

1. **Electronic signature workflow** matches FAA Form 8100-9 structure. The inspector's certificate number is captured, timestamp is FAA-compliant, and the signature is cryptographically tied to the user account. This is not just a checkmark in a box — it's defensible in an enforcement action.

2. **Work order continuity tracking.** When a work order is modified post-authorization (additional discrepancies found), Corridor creates a traceable amendment record with original vs. modified authorization, timestamp, and approver. This is exactly what the FAA wants to see.

3. **Return-to-service traceability.** The RTS sign-off in Corridor requires mandatory completion of: airframe total time, Hobbs time, date of return, IA certificate number (if required), and confirmation that all open task cards are resolved. It won't let you close a work order with an unresolved task card. This sounds obvious — it is not universally implemented in competitors.

4. **Parts traceability to 8130-3.** When a part is issued to a work order from inventory, Corridor captures the 8130-3 (or FAA Form equivalent) data: part number, serial number, batch/lot number, traceability documentation, condition code. The linkage is work order → task card → part issue → 8130-3 document. An inspector can follow that chain in the software.

5. **Squawk history persistence.** Recurring squawks (same discrepancy reported across multiple visits) are linkable in Corridor, and the system flags when a repair has been performed more than twice on the same component. This is a valuable safety feature that a DOM would miss if it disappeared.

---

## Competitor 2: EBIS 5

### 2.1 Background

EBIS 5 is developed by Aviation Industries Corporation (AIC) / AMES, a US-based MRO software company with a long history in GA and regional operations. EBIS 5 is widely used in general aviation repair stations, helicopter operators, and regional air carriers. It's the system you're more likely to find at a mid-size Part 145 doing piston and light turbine work.

EBIS 5 is a Windows desktop application. There is an EBIS Web component, but it is not a full replacement — it provides limited functionality (primarily read access and basic work order status) and is considered a reporting interface, not a working interface, by most EBIS power users.

### 2.2 Strengths — What EBIS 5 Does Genuinely Well

**Scheduling is exceptional.** EBIS 5's aircraft scheduling and maintenance due tracking is the best in the GA/regional segment. The "squawk sheet" → work order pipeline is fast. Maintenance due lists are configurable by calendar, flight hours, cycles, and combinations thereof. The visual "what's due in the next 30 days" dashboard is genuinely useful and genuinely accurate when properly configured.

**Parts traceability depth.** EBIS 5's parts module tracks the full chain: PO → receiving → inspection → storeroom → issue → work order → aircraft record. Serial number tracking, batch/lot control, core exchange tracking, and component overhaul records are all handled. Power users describe this as "the thing I'd miss most" about EBIS 5 if they switched.

**Speed for experts.** EBIS 5 is keyboard-shortcut heavy. A fluent EBIS 5 user — someone who's been using it for 3+ years — can navigate the system faster than any web-based alternative I've seen. The shortcuts are non-obvious and require learning, but the reward is genuine speed. This is a major retention factor.

**Flexibility in custom fields.** EBIS 5 allows shops to add custom fields to most records — work orders, aircraft, customers — without vendor involvement. This is genuinely useful for shops that track unique data (e.g., aircraft paint scheme for an FBO, special handling codes for a charter operator).

**Established user community.** EBIS 5 has a user group and a mailing list with active participation. Power users share tips, workarounds, and custom report templates. This informal knowledge base is a switching cost that doesn't appear on any pricing sheet.

### 2.3 Weaknesses — Where Customers Genuinely Suffer

**Desktop-first in 2026 is a liability.** The primary EBIS 5 interface is a thick Windows client. This means:
- Shop must maintain Windows machines accessible to mechanics.
- No native mobile access for technicians in the hangar.
- Remote access (for DOM working from home, for multi-site shops) requires VPN and Windows Remote Desktop, which introduces latency and session management problems.
- Technicians who need to look up a part number or check a work order status while at the aircraft have to walk back to a workstation.

**EBIS Web is not a real product.** It exists, but I've yet to meet an EBIS 5 shop that uses EBIS Web as their primary interface. It's limited in functionality, visually dated, and power users explicitly say "I only use the desktop."

**Reporting requires Crystal Reports.** EBIS 5's built-in reports are generated via Crystal Reports templates. Customizing a report requires Crystal Reports expertise, which is increasingly rare. Shops that need custom reporting either hire a consultant or export data to Excel and work there.

**Data backup and IT burden.** EBIS 5 is installed on the shop's Windows server. Backup, disaster recovery, software updates, and database maintenance are the shop's responsibility. I've talked to shop owners who have lost data due to server failures and had no recovery path. This is a genuine business risk.

**Multi-site is painful.** EBIS 5 is not architected for multi-site operations. Shops with two locations either run separate instances (with no shared data) or have elaborate VPN configurations to point both locations at the same database. Both approaches create problems.

### 2.4 UI/UX: What It Actually Feels Like

EBIS 5's interface is Windows MDI (Multiple Document Interface) — a paradigm that Microsoft deprecated in the early 2000s. Multiple "windows" open inside a parent window. Records overlap each other. There's no spatial consistency: a work order might open in the center of the screen one time and in the upper left the next.

The main navigation is a tree view on the left side — very Windows Explorer-like. Expanding nodes reveals sub-nodes. Finding a customer's aircraft requires knowing whether to look under "Customers > [Customer Name] > Aircraft" or "Aircraft > [Tail Number]." Both paths exist. They show subtly different views of the same record.

Color coding exists but is not consistent. Status indicators are small icons that require hovering to understand. Critical information — airworthiness limit approaching, open squawk, outstanding part order — can hide in plain sight.

The print-first design is everywhere. Records are clearly designed to be printed and signed on paper. Electronic signatures exist but are bolted on rather than native to the workflow.

**What an EBIS 5 power user says when they hear the shop is evaluating Athelon:**
> "I'm going to need to see where they put the parts issue screen before I believe it's real. And I want to know if it handles core exchanges. And what about the Hobbs tracking — does it do automatic maintenance due based on Hobbs? Because if it can't do that, I don't care how pretty it is."
> — Lead AMT / Parts Manager at a 12-mechanic turbine shop, interviewed Jan 2026

This is the right frame. EBIS 5 power users are not loyal to EBIS 5 — they're loyal to their workflows. The question they're asking is whether Athelon can absorb the workflows they've built over years of EBIS 5 use. If the answer is yes, they'll switch. If the answer is "mostly yes," they'll stay.

### 2.5 Implementation

EBIS 5 implementation is faster and cheaper than Corridor. It's a self-service model (with optional consulting):

- **Timeline:** 4–8 weeks for a simple shop. 3–4 months for a complex operation.
- **Self-install:** EBIS 5 can be installed by a moderately tech-savvy shop manager without vendor involvement.
- **Training:** 2-day on-site training available. Much of the community learns from peer shops and the user group mailing list.
- **Data migration:** More painful than Corridor's. EBIS 5's data structures are not well-documented for export. Shops migrating from paper have an easier time than shops migrating from another system.
- **Cost:** $5,000–$20,000 in consulting for a full implementation. Self-service implementations run $0–$3,000.

### 2.6 Pricing Model

EBIS 5 pricing is more transparent than Corridor. Publicly known:

- **License:** One-time perpetual license purchase + annual maintenance/support fee. Estimated one-time cost: $3,000–$15,000 depending on modules and user count. Annual support: approximately 18–22% of license cost.
- **Modules:** Core, Parts, Scheduling, Customer Portal, and EBIS Web are separately licensed.
- **Total annual cost for a small shop:** $1,500–$4,000/year in support fees after initial license purchase.

This makes EBIS 5 significantly cheaper than Corridor for small shops — which is a core part of its market position.

### 2.7 Customer Switching Cost

**The keyboard shortcut factor.** I want to emphasize this. A fluent EBIS 5 power user has invested 3–5 years building muscle memory for a specific set of keyboard shortcuts. Switching to a new system means that investment is worthless. This is not rational — the shortcuts are not objectively better — but the pain is real and the resistance is strong.

**The historical data factor.** EBIS 5 shops have years of maintenance history: work orders, parts history, squawks, component overhaul records. Migrating this data is non-trivial, and the risk of data loss in migration is a genuine concern.

**The "it's paid for" factor.** Because EBIS 5 is a perpetual license, shops feel they own it. Switching to a subscription-based model (like Athelon) feels like paying more even if the total cost of ownership is lower. This requires reframing in the sales conversation.

---

## Feature Gaps Across Both Competitors — Athelon's Specific Win Conditions

### Gap 1: Real Mobile Access

Neither competitor has a functional mobile story. Corridor Web is theoretically mobile-responsive. EBIS 5 has no mobile interface. Both require technicians to leave the aircraft and walk to a workstation to log time, request parts, or sign off a task card.

**Athelon's win:** Native mobile-first PWA with glove-friendly touch targets (minimum 48px, preferred 60px), offline capability for areas of poor shop Wi-Fi, and one-tap workflows for the most common technician actions (log time, request part, sign task card, note squawk). This alone is a differentiator that both DOMs and AMTs will immediately recognize.

### Gap 2: Real-Time Operational Visibility

Both competitors require active navigation to understand shop status. There is no live "what's happening in my shop right now" view that doesn't require pulling a report.

**Athelon's win:** A configurable live dashboard — tail numbers, work order status, open squawks, techs clocked in, parts on order — that updates in real time without page reload. A DOM should be able to see her shop's status from her phone before her first cup of coffee. This doesn't exist in either competitor.

### Gap 3: Onboarding Speed

Corridor: 6–18 months. EBIS 5: 4–8 weeks. Neither is acceptable for the small Part 145 market.

**Athelon's win:** Guided, self-service onboarding in under 2 weeks. Aircraft, customers, and personnel are loaded via CSV import or manual wizard. The first work order is created on Day 1. Compliance documentation is not deferred — it's part of the onboarding flow, not an afterthought. Target: a solo DOM with no IT support can have Athelon operational for her shop in 3 working days.

### Gap 4: Transparent, Predictable Pricing

Corridor: opaque, seat-based, module-fragmented, multi-year commitment. EBIS 5: perpetual license with annual support, but up-front cost creates sticker shock.

**Athelon's win:** Per-shop, per-month pricing with all features included. No module add-ons. No seat fees (shop-based, not seat-based for the core tier). Published on the website. Free trial tier for shops under 3 aircraft. The owner should be able to evaluate Athelon, understand what it costs, and sign up without a sales conversation if they choose.

### Gap 5: Modern Search and Filtering

Both competitors have broken or limited search. Finding a work order, part, aircraft, or customer requires knowing the exact navigation path to the right module.

**Athelon's win:** Universal search across all record types from any screen. Type a tail number, a customer name, a part number, or a work order number and get relevant results in under 200ms. Filter by status, date range, technician, or aircraft. This should feel like the search the user already knows from their phone, not a database query interface.

### Gap 6: Intelligent Maintenance Forecasting

EBIS 5 does maintenance due tracking well but presents it as a list. Corridor does it adequately. Neither uses the data they have to help the shop plan ahead.

**Athelon's win:** Proactive forecasting — "Aircraft N123AB has 3 maintenance items due in the next 60 days; based on your current booking rate, you have 2 windows available." This requires no AI magic — just time-based calculations and calendar integration — but neither competitor does it.

### Gap 7: Customer Communication Integration

Both competitors are internally-facing tools. Customer communication (estimates, approvals, status updates, invoices) happens via email or phone outside the system, then gets transcribed back in.

**Athelon's win:** Customer-facing portal with digital authorization signatures, real-time work order status, and integrated invoicing. Customer approves an additional discrepancy on their phone; the DOM sees the authorization in Athelon within seconds; the mechanic can proceed without a phone call.

---

## Strategic Summary

| Dimension | Corridor | EBIS 5 | Athelon Target |
|---|---|---|---|
| Compliance depth | ✅ Gold standard | ⚠️ Adequate | ✅ Match Corridor |
| Mobile | ❌ Unusable | ❌ Nonexistent | ✅ Mobile-first |
| Implementation time | ❌ 6–18 months | ⚠️ 4–8 weeks | ✅ 3–5 days |
| Pricing transparency | ❌ Opaque | ⚠️ Upfront cost | ✅ Published, simple |
| Real-time visibility | ❌ Reports only | ❌ Reports only | ✅ Live dashboard |
| Search | ❌ Broken | ❌ Limited | ✅ Universal |
| Customer portal | ⚠️ Limited | ❌ No | ✅ Native |
| Parts traceability | ✅ Strong | ✅ Strongest | ✅ Match or exceed |
| Scheduling | ⚠️ Adequate | ✅ Best in class | ✅ Match EBIS 5 |
| IT burden | ⚠️ Cloud (high cost) | ❌ Self-hosted | ✅ Zero IT burden |

**Where Athelon wins:** Speed of onboarding, mobile experience, real-time visibility, pricing simplicity, and customer integration.
**Where Athelon must not lose:** Compliance depth and parts traceability. If an FAA inspector cannot find what they need in Athelon, we have failed regardless of how good everything else is.

---

*Document prepared by Nadia Solis. For questions, see her directly — not via the team Slack channel where 47 people will have opinions.*
