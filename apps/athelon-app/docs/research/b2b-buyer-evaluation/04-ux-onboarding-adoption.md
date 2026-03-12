# B2B Buyer Evaluation: UX, Onboarding & Adoption

**Research corpus for Athelon — FAA Part 145 MRO SaaS**
Last updated: 2026-03-12

---

## Executive Summary

In B2B SaaS, UX is no longer a "nice to have" — it is a primary buying criterion that determines whether deals close and whether customers renew. For aviation MRO specifically, the stakes are higher than most verticals: technicians who cannot figure out software will revert to paper, creating the worst possible outcome — you are paying for software nobody uses while compliance documentation lives in a filing cabinet.

This document maps UX evaluation criteria, demo execution, onboarding design, adoption challenges specific to MRO shops, and the change management playbook required to drive genuine adoption post-sale. It is written as a practical operating guide for a founder navigating both the enterprise deal cycle and the post-sale implementation reality.

The core thesis: **win the demo by showing domain fluency, reduce time-to-value by designing for the technician first, and protect renewal by making the shop manager a hero within 90 days.**

---

## 1. UX Evaluation Criteria B2B Buyers Prioritize

### 1.1 The Modern B2B UX Standard

The B2B-to-consumer UX gap has closed. Buyers who use Stripe, Linear, Notion, and Figma in their personal and startup lives now expect enterprise software to meet consumer-grade design standards. The legacy MRO software market (legacy vendors like AMOS, TRAX, Quantum MRO) set a low bar — most of their interfaces were designed in the late 1990s and have aged accordingly. This is Athelon's primary structural opportunity.

What buyers evaluate on first exposure:

| Criterion | What They Are Actually Testing | Athelon Implication |
|---|---|---|
| **Ease of use** | Can a new user complete a core task without training? | Work order creation must be < 3 clicks from any context |
| **Learning curve** | How long until a technician is self-sufficient? | Target: first meaningful task in < 15 minutes, unsupported |
| **UI modernity** | Does this look like it was built in the last 5 years? | Tailwind + shadcn/ui already addresses this; avoid dense tables |
| **Mobile responsiveness** | Can a technician use this on the shop floor from a tablet? | Not optional — Part 145 shops increasingly run iPad-based workflows |
| **Accessibility / WCAG** | Can users with color deficiency or low vision use this? | WCAG 2.1 AA is the threshold; affects buyers with ADA obligations |
| **Performance** | Does it feel fast? | Perceived latency under 300ms for common interactions |
| **Consistency** | Do similar actions work the same way across modules? | Component standardization via shadcn/ui — enforce it |

### 1.2 The Hierarchy of B2B UX Evaluation

Not all UX criteria carry equal weight across stakeholder types. A procurement evaluation involves at least three distinct user personas, each prioritizing differently:

**The champion (Shop Manager / Director of Maintenance):**
- Evaluates whether the tool reduces their administrative burden
- Wants clear dashboards with meaningful metrics, not raw data dumps
- Cares deeply about whether their team will actually use it
- Veto point: "My techs won't use this" kills the deal regardless of any other factor

**The end user (Technician / Inspector):**
- Cares only about whether it is faster than paper
- Will adopt if the workflow matches how they actually do work
- Will abandon if they have to enter the same data twice
- Key insight: technicians are highly competent professionals — condescending UX is insulting

**The buyer (Owner / COO / Accountant at smaller operators):**
- Evaluates the demo from a business outcomes perspective
- Asks: "Will this reduce errors? Will this survive an FAA audit?"
- Responds to compliance audit trail, not feature lists

### 1.3 The Feature-Discoverability Trap

A common B2B SaaS UX failure: burying powerful features behind training requirements. If a buyer in a demo cannot discover a feature without being shown it, that feature has zero demo value. The inverse is also true — if a feature requires a 30-minute explainer, it signals adoption risk.

Design principle for Athelon: **every feature visible in a demo should be discoverable by a new user within 2 clicks.** If it requires a tooltip, the IA is wrong.

### 1.4 Accessibility Requirements

WCAG 2.1 AA compliance is increasingly required in enterprise RFPs for software procured by operators with FAA certificates — especially any operator with Part 121 airline affiliations who faces ADA obligations. Minimum requirements:

- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard-navigable
- Form labels programmatically associated with inputs
- Error messages descriptive, not just "invalid input"
- No critical information conveyed by color alone (critical for status badges on work orders)

For MRO specifically: shop floor lighting varies widely. High-contrast mode and large-text support are genuine usability requirements, not just accessibility box-checking.

---

## 2. First Impression / Demo Experience

### 2.1 What Happens in the First 5 Minutes

Research on B2B SaaS demos consistently shows that buyers form their impression — positive or negative — within the first 5 minutes. What drives that impression is not the number of features shown but the clarity of the value narrative.

**The first 5 minutes must answer three questions the buyer is already asking:**
1. Does this vendor understand my world? (domain credibility)
2. Will my team actually use this? (adoption confidence)
3. What changes for me specifically? (personal ROI)

If a demo opens with a feature tour rather than answering these questions, the buyer begins looking for reasons to say no.

### 2.2 The Demo Structure That Works

The structure that consistently wins in B2B SaaS demos follows a "villain-hero" arc:

**Minutes 0–2: Name the villain (the current pain)**
Open with a specific, accurate description of a problem the buyer lives with daily. For MRO:
- "You're running a squawk that was found during a 100-hour inspection. Walk me through how that gets documented, assigned, tracked to closure, and shows up in the maintenance record."
- Let them describe the problem. Do not describe it for them.

**Minutes 2–5: The hero moment (one workflow end-to-end)**
Show the answer to the villain — not a feature list, but a single workflow that resolves the pain they just described. For Athelon:
- Open a squawk from an aircraft's maintenance log
- Assign it to a technician with a required skill level
- Show the technician's task card view on a tablet
- Close the squawk with a sign-off that populates the maintenance record

This single sequence — 3 minutes — demonstrates more value than a 45-minute feature tour.

**Minutes 5–15: Depth on their specific questions**
Answer what they ask. Stop volunteering features. Every feature you show without being asked is a feature that raises adoption risk questions.

**Minutes 15–30: Handle objections / show differentiators**
Compliance audit trail, AD compliance tracking, role separation for QC inspectors — show these when directly asked or when the conversation turns to regulatory compliance.

**Minutes 30–45: Commercial discussion / next steps**
Do not finish a demo without a defined next step. "We'll send you a recording" is a next step that kills momentum.

### 2.3 What Kills a Demo

| Deal killer | Why it happens | How to prevent it |
|---|---|---|
| Demo environment with fake/sparse data | The UI looks empty; buyer cannot visualize adoption | Maintain a demo environment with realistic data: 20+ work orders, 8+ aircraft, real squawk types |
| Feature tour without narrative | Buyer cannot connect features to outcomes | Structure demo around one complete workflow before showing any individual features |
| Slow load times | Buyer thinks the app is slow in production | Demo from a local network; never demo over cellular |
| Can't answer compliance questions | Buyer assumes the vendor doesn't understand Part 145 | Prepare a one-page "compliance architecture" document for the demo |
| "We'll add that in Q3" | Every roadmap promise raises risk questions | Only reference roadmap items when directly asked; frame as "this is how we're approaching it" |
| UI that looks like a spreadsheet | Signals high training cost | Avoid showing any dense table-heavy views in the first 15 minutes |

### 2.4 The Demo Environment for Athelon

A realistic Athelon demo environment should contain:
- 5–8 aircraft with varying maintenance schedules and AD compliance status
- 15–25 open work orders in different lifecycle stages (planned, in-progress, awaiting parts, awaiting inspection)
- 8–12 technicians with different roles and skill levels
- 3–5 vendors with active parts orders
- At least 2 open compliance items with audit documentation
- 1 recently completed work order with full documentation chain

This data density makes the dashboards meaningful and makes the compliance reports show actual value.

---

## 3. Onboarding Expectations

### 3.1 The B2B Onboarding Expectation Gap

B2B buyers evaluating SaaS in 2025 expect onboarding to be largely self-directed for standard configurations. The era of "we'll schedule your implementation consultant" as a default response is over for sub-enterprise deals. Buyers expect:

- An admin can get the system configured in hours, not days
- End users can be productive without mandatory training sessions
- Help is available in-app, not behind a support ticket

For MRO specifically, there is an important caveat: **the initial data setup (aircraft registry, employee roles, AD compliance baseline) requires domain expertise and cannot be trivially self-served.** The expectation is not zero-touch onboarding — it is high-quality guided onboarding that respects the buyer's time.

### 3.2 Guided Setup Flow (Admin)

The admin onboarding flow should follow a structured checklist with clear progress indicators. Recommended phases for Athelon:

**Phase 1 — Organization Setup (15–30 minutes)**
- Set repair station information (certificate number, capabilities)
- Configure org-level settings (fiscal year, timezone, regulatory regime)
- Invite first admin users and assign roles

**Phase 2 — Fleet Registration (30–60 minutes per aircraft)**
- Aircraft basic data (tail number, make/model/serial, registration)
- Import or enter maintenance history baseline
- Associate ADs from FAA database (Athelon can pre-populate from tail number)

**Phase 3 — Team Setup (15–30 minutes)**
- Create technician profiles with certificate numbers and skill ratings
- Assign roles (technician, inspector, shop manager, etc.)
- Configure notification preferences

**Phase 4 — First Work Order (10 minutes)**
- Guided creation of first work order with sample data pre-filled
- Walk through complete lifecycle to closure
- "You've completed your first work order" milestone moment

Each phase should have an explicit completion state and a visual checklist that persists in the sidebar until all phases are done. Incomplete onboarding is the single largest predictor of 90-day churn.

### 3.3 Role-Based Onboarding Flows

Different user roles need different onboarding paths. A technician's first experience should not begin with admin configuration screens. The onboarding flow should detect the user's role and serve a relevant path:

| Role | First-session priority | "Aha moment" |
|---|---|---|
| **Admin / Shop Manager** | Organization and fleet setup | Seeing first aircraft's dashboard with AD status |
| **Technician** | Assigned work queue | Claiming and completing first task card |
| **QC Inspector** | Open items requiring sign-off | Completing first inspection sign-off with audit trail |
| **Parts Clerk** | Open parts requests on active WOs | Fulfilling first parts request |
| **Billing Manager** | Open invoiceable WOs | Generating first customer invoice |

Role detection at login (based on org role assigned during admin setup) and a role-specific welcome flow is the minimum acceptable standard.

### 3.4 In-App Help and Contextual Guidance

Buyers evaluate the quality of in-app help during the demo — they will often click the help icon specifically to test it. Expectations:

- **Contextual tooltips** on complex fields (especially compliance-related fields)
- **In-app documentation** searchable without leaving the workflow
- **Guided tour** available on demand (not mandatory on first login — this frustrates experienced users doing evaluations)
- **Video walkthroughs** for complex multi-step workflows (e.g., opening a squawk from an AD, creating a task card, final sign-off)
- **Keyboard shortcuts** documented for power users
- **Changelog / what's new** surface so users know about updates

### 3.5 Data Import

For any buyer migrating from an existing system, data import capability is a hard requirement. Minimum expectations:

- Aircraft data importable via CSV with clear column mapping
- Maintenance history importable (even if flat CSV — buyers expect to bring their records)
- Employee roster importable
- Clear documentation of what can and cannot be imported
- A dedicated import wizard with validation feedback ("3 rows have errors — here is what's wrong")

Buyers who are told "we'll handle the data migration for you" hear "this will take months and cost money." The better answer is "here's the import wizard — you can do the aircraft registry in an hour."

---

## 4. Time-to-Value Metrics

### 4.1 Defining Time-to-Value for MRO Software

Time-to-value (TTV) is the elapsed time between account creation and the first meaningful outcome the user values. For MRO software, there are two relevant TTV measurements:

**Activation TTV**: Time from account creation to first completed work order with documentation.
- Target: < 2 hours for an admin who is motivated and has their data available
- Industry average for legacy MRO software: 2–8 weeks with consultant involvement

**Full productivity TTV**: Time from account creation to the point where the system is the shop's primary record-keeping tool.
- Target: < 30 days for a 5–10 person shop
- Industry average for legacy MRO software: 3–6 months

The gap between these targets and legacy software reality is Athelon's most powerful competitive narrative.

### 4.2 The Activation Metric

Research from SaaS analytics platforms (Pendo, Amplitude) consistently shows that users who do not complete a meaningful first task within their first session are 3–5x more likely to churn before their first renewal. The activation moment must happen in session 1.

For Athelon, the activation moment should be **the first completed work order with a signed-off task card and a documentation trail.** This is the moment the user experiences the core value proposition: compliance documentation that is easier and more auditable than paper.

Designing backward from this activation moment:
- The admin must be able to get a technician into a work order within 15 minutes of first login
- The technician must be able to complete a task card sign-off within 10 minutes of receiving access
- The work order summary page must visually demonstrate the documentation quality

### 4.3 Time-to-Value by Persona

| Persona | TTV target | What constitutes "value realized" |
|---|---|---|
| Admin / Shop Manager | < 1 hour | Can see their full fleet with AD status at a glance |
| Technician | < 15 minutes | Has completed first task card sign-off |
| QC Inspector | < 20 minutes | Has reviewed and signed off first inspection item |
| Owner | < 30 minutes | Has seen the audit trail that would satisfy an FAA inspector |

### 4.4 TTV Anti-Patterns to Avoid

- Forcing users through a multi-screen "getting started" flow before they can do anything real
- Requiring configuration of optional settings before core functionality is accessible
- Blocking access to the app while "your account is being set up"
- Showing an empty dashboard as the first experience (blank state screens signal "this product is empty")

The antidote to blank states: ship every new account with sample data loaded by default, with a clearly labeled "sample data" badge and a one-click "load my real data" path.

---

## 5. User Adoption Challenges in MRO Shops

### 5.1 The Paper-First Culture

Aviation maintenance is a paper-first industry, and for legitimate reasons. The FAA has historically required wet signatures on maintenance records. Many Part 145 shops have spent decades building paper-based QC processes that work. The mental model of many AMTs (Aircraft Maintenance Technicians) is:

- Paper is permanent; software can crash
- Paper cannot be altered without evidence; software can be
- Paper does not require training; software does
- Paper works on the ramp in the rain; software does not

These are not irrational objections. A go-to-market narrative that dismisses paper as "outdated" will lose the technician's trust. The correct narrative: **Athelon makes the documentation side of your job faster and protects your certificate.** The technician's license is on the line every time they sign off a discrepancy — the pitch should be that digital records make it easier to prove they did the job right.

### 5.2 Varying Tech Literacy Across Shop Roles

MRO shops span a wide tech literacy range:

| Role profile | Typical tech comfort | UX implication |
|---|---|---|
| 22-year-old A&P freshly certified | High — grew up digital | Wants modern UI, frustrated by clunky interfaces |
| 45-year-old lead technician with 20 years on type | Low-medium — tolerates necessary tech | Needs very clear, unambiguous workflows; no ambiguity in status labels |
| Shop owner / operator | Variable — often runs everything on spreadsheets | Evaluates the tool from a "will my team use this" lens |
| Office admin / parts manager | Medium — comfortable with business software | Expects familiar patterns: search, filter, export |

The UX must work for the 45-year-old lead tech. If it does, the 22-year-old will be fine. The reverse is not true.

Design implication: **large tap targets, unambiguous status labels, never rely on hover states for important information, no jargon in UI labels that isn't standard FAA/MRO terminology.**

### 5.3 Shop Floor Conditions

Software designed in an office is often unusable in a hangar. Real shop floor conditions include:

- **Light levels**: Ranging from bright overhead fluorescents to dim hangar floors to direct sunlight near aircraft doors. High-contrast mode is not optional.
- **Gloved hands**: Capacitive touch screens do not work well with standard work gloves. Large tap targets (minimum 44px, preferably 56px) matter.
- **Noise**: Voice interface is not viable on a shop floor; everything must be readable without audio.
- **Interruption**: Technicians are frequently pulled away mid-task. Auto-save is required; partial progress must persist.
- **Connectivity**: Not all hangars have reliable WiFi. Offline capability for task card viewing and at minimum offline read access is a competitive differentiator.

**Mobile-first is not a marketing claim — it is a survival requirement for MRO software adoption.** A tool that only works well on a desktop will not be used on the floor.

### 5.4 Resistance Patterns and How to Address Them

The most common adoption failure modes in MRO shops, and the mitigation for each:

**Pattern: "We'll do both" (parallel paper + software)**
This is the most common failure mode. The shop starts using the software but maintains paper records "just in case." Within 90 days, the paper process becomes the primary process and the software is abandoned.

Mitigation: Design the software so that the digital record is *less work* than paper from day one. If the digital workflow creates more friction than the paper alternative, the paper will win. Focus relentlessly on reducing clicks.

**Pattern: The champion leaves**
The internal champion who drove the purchase leaves the organization. The replacement has no investment in the new tool and reverts to legacy processes.

Mitigation: Make the value visible to the entire team, not just the champion. Each user should have a personal reason to use the tool (technician: protects their license; inspector: faster sign-offs; owner: cleaner audit trail).

**Pattern: "It doesn't do X"**
Users encounter a missing feature early in adoption and generalize to "this software doesn't meet our needs."

Mitigation: Onboarding should include a feedback channel with clear response commitments. "We heard this and it is on the roadmap for Q2" converts a churn risk into a product advocate.

**Pattern: Slow performance on the shop floor**
The app is fast in the demo environment and slow on the shop's WiFi.

Mitigation: Optimize for 3G-equivalent performance, not office broadband. Test all critical workflows on throttled connections before shipping.

---

## 6. Training and Enablement Expectations

### 6.1 The Modern Training Stack

B2B SaaS buyers in 2025 expect a layered training offering. The days of mandatory in-person training as the only path to proficiency are over except for the most complex implementations. The expected stack:

| Layer | Format | Expected delivery |
|---|---|---|
| **Self-service documentation** | Written, searchable, always available | In-app help center + public docs site |
| **Video library** | Short (2–5 min) role-specific task walkthroughs | Embedded in-app + linked from relevant pages |
| **Guided in-app tours** | Interactive product tours on first use | Triggered by role at first login |
| **Live onboarding session** | 60-minute video call for admin setup | Scheduled within 48 hours of account creation |
| **Advanced training** | Deep dives on compliance, reporting, integrations | Available on request; not mandatory |
| **Admin certification** | Optional formal certification program | Strong differentiator for enterprise buyers |

### 6.2 Admin vs. End-User Training

These are fundamentally different training problems and should not be conflated:

**Admin training** is about configuration, workflow design, and understanding the compliance architecture. It requires more depth and is typically a 2–4 hour investment. Key topics:
- Setting up roles and permissions correctly (affects audit trail)
- Configuring work order templates for their specific operations
- Understanding how AD compliance tracking works with their aircraft
- Generating reports for FAA audits

**End-user (technician) training** is about task completion. It should require no more than 30 minutes to reach basic proficiency for core tasks. If a technician needs more than 30 minutes of training to complete a task card, the UI is wrong.

The distinction matters for selling: buyers will ask "how long does it take to train my team?" The answer for a technician completing core tasks should be "about 20 minutes — here's the walkthrough." This is a competitive differentiator against legacy systems that require 2–3 day training programs.

### 6.3 Documentation Quality as a Buying Signal

Documentation quality is evaluated during the buying process as a proxy for overall product quality. Buyers who navigate to the help documentation during a trial are testing whether the vendor takes ongoing support seriously.

Key documentation quality signals:
- Documentation is current (not showing screenshots from 2 versions ago)
- Searchable — buyers test this explicitly
- Written from the user's task perspective, not the engineer's feature perspective
- Includes real examples with realistic data (not "widget_123")
- Available without login for at least basic workflow documentation

### 6.4 Certification Programs as a Retention Mechanism

For aviation specifically, a formal "Athelon Certified Administrator" program would resonate with the market. Reasons:
- Aviation maintenance culture values formal certification and documented competency
- Certified admins become internal champions with personal stake in the product's success
- Certification programs create switching cost (the certified admin's status is tied to Athelon)
- Can be used as a sales requirement: "We recommend your shop manager completes the certification before going live"

Minimum viable certification program: a self-paced course (8–12 modules, each 10–15 minutes), a knowledge assessment, and a digital certificate that can be shared on LinkedIn or included in the shop's quality manual.

---

## 7. Change Management

### 7.1 Why Change Management is an MRO Product Feature

Most SaaS vendors treat change management as the customer's problem. For MRO software, this is a strategic mistake. The aviation maintenance industry has the highest regulatory compliance burden of any industry Athelon competes in — and the consequences of a botched software transition are not just churn, they are FAA audit failures, certificate actions, and aircraft accidents.

Athelon should treat change management as a product feature, not a professional services add-on. This means building change management scaffolding into the product itself:

- **Transition period support**: Allow both paper logs and digital records to coexist during transition, with a clear "going fully digital on [date]" milestone
- **Compliance gap visibility**: Surface any work orders or aircraft that lack complete digital documentation
- **Migration readiness checklist**: Before a customer "goes live" on a specific aircraft, the product should show a clear checklist of what needs to be in place

### 7.2 The Transition Playbook

A structured transition from paper/legacy to Athelon should follow this sequence:

**Phase 1: Parallel operation (Days 1–30)**
- Configure Athelon for the full fleet and team
- Run all new work orders in Athelon
- Continue paper records for audit continuity
- Goal: build team familiarity before the paper safety net is removed

**Phase 2: Digital primary (Days 30–60)**
- Stop creating new paper records
- All QC sign-offs happen in Athelon
- Paper records archived and referenced for historical lookups
- Goal: validate that digital records are complete and compliant

**Phase 3: Full commitment (Day 60+)**
- Paper records closed out and stored per records retention requirements
- Athelon is the system of record
- Monthly review of documentation completeness metrics
- Goal: demonstrate to FAA auditors that the digital system is the primary maintenance record

This playbook should be documented and delivered to every new customer as part of onboarding. Customers who follow the playbook renew. Customers who skip phases get stuck in parallel operation indefinitely.

### 7.3 Managing Technician Resistance

The most effective change management for technicians is not training — it is demonstrating that the new tool makes their work life better in a tangible, immediate way. Abstract benefits ("better compliance") do not drive adoption. Concrete daily-life improvements do.

For MRO technicians, the concrete improvements to lead with:

- **"You'll never fill out the same squawk twice."** Digital records eliminate duplicate documentation.
- **"Your sign-off is permanently on record."** When an FAA inspector asks about a job you did 3 years ago, you can pull it up in 30 seconds.
- **"You can see the full maintenance history before you touch the aircraft."** No more hunting for paper logs.
- **"If something doesn't look right, you can flag it from the floor."** The discrepancy trail goes directly to the shop manager.

The key insight: **frame the tool as protecting the technician's certificate, not as making the manager's reporting easier.** The technician's A&P certificate is their livelihood. Software that helps protect it earns genuine adoption.

### 7.4 The Manager as Change Agent

The shop manager is the most critical person in any MRO software adoption. They set the cultural tone. If the shop manager does not use the software visibly and consistently, the team will not either.

The product should give the shop manager specific, visible wins within the first 30 days:

- A dashboard that shows at a glance which WOs are at risk of missing their estimated completion
- An AD compliance summary that shows upcoming due items across the fleet
- A technician productivity view that shows work completed per technician per day

These are not vanity metrics — they are the first things a shop manager would want in a Monday morning standup. When the shop manager is using Athelon to run their team meeting, the team adopts Athelon.

---

## 8. Product-Led Growth Signals

### 8.1 What B2B Buyers Look for in PLG Products

Product-led growth (PLG) is the strategy of using the product itself to drive acquisition, activation, retention, and expansion. B2B buyers in 2025 have been trained by PLG companies (Figma, Slack, Notion, Linear) to expect:

- **Self-serve evaluation**: Can I try this without talking to a salesperson?
- **Immediate value**: Can I experience the core value within 15 minutes?
- **Organic viral loop**: Will my team naturally invite others?
- **In-product expansion**: Can I upgrade or add capabilities from within the product?

For Athelon, a full PLG motion with free trials is a viable long-term strategy but may not be appropriate at early stage when high-touch sales is the right GTM. However, PLG *signals* — evidence that the product can sell itself — matter even in a sales-led motion because they build buyer confidence.

### 8.2 Self-Serve Capabilities That Signal Quality

| Capability | PLG signal | MRO-specific value |
|---|---|---|
| **Free trial or sandbox** | Low friction evaluation | Buyers can test Part 145 workflows before committing |
| **In-app upgrade path** | Product drives expansion | Add aircraft, add users, unlock compliance features |
| **Guided setup without sales** | Product is intuitive | Reduces perceived implementation risk |
| **Import from competitors** | Switching friction removed | CSV import from legacy systems |
| **Public documentation** | Transparent and high quality | FAA auditors can validate the system without sales involvement |
| **API availability** | Extensible without support | Integrations with CAMP, AFMS, QuickBooks |

### 8.3 In-App Analytics and Customizable Dashboards

Enterprise buyers evaluating MRO software specifically want to know: "What data will this give me that I don't have today?"

The analytics surface should be a demo centerpiece, not an afterthought. High-value analytics for MRO:

- **Fleet health summary**: Upcoming maintenance items by aircraft, overdue ADs, squawks awaiting resolution
- **Technician utilization**: Hours billed vs. available capacity, by technician and by WO
- **WO cycle time**: Average time from squawk-open to sign-off, trended over time
- **Parts turn rate**: Time from parts request to parts received, by vendor
- **Customer invoice aging**: Outstanding invoices by customer with aging buckets

Customizable dashboards — where the shop manager can pin the 4–5 metrics they check daily — signal product maturity and reduce the "we need custom reporting" objection.

### 8.4 Virality and Team Expansion

In B2B MRO software, virality is driven by role expansion. Initial adoption is typically admin + shop manager (2 seats). The viral loop expands through:

- **Technician seat expansion**: As the platform becomes the primary task management tool, every technician needs access
- **Inspector seat expansion**: QC sign-offs require inspector accounts; this is often a regulatory requirement once the shop commits
- **Customer portal expansion**: Giving customers visibility into their aircraft's work order status is a natural upsell
- **Multi-location expansion**: An operator who acquires a second location already knows Athelon

Design each of these expansion moments as in-product prompts: "Add your first technician" as a checklist item during onboarding, "Invite your QC Inspector" as a prompt when the first inspection is created.

### 8.5 The Compliance Audit as a Growth Trigger

MRO software has a unique PLG trigger with no equivalent in generic SaaS: the FAA audit. When a shop is preparing for an FAA AAIP (Air Agency Inspection Program) inspection, they need to demonstrate that their maintenance records are complete, traceable, and accessible. A shop running Athelon can pull this together in minutes. A shop running paper and spreadsheets spends days preparing.

Word of mouth in the aviation maintenance community travels fast. A shop owner who tells their peer "I passed my AAIP inspection and pulled everything from Athelon in 20 minutes" is the highest-value growth event Athelon can engineer. This suggests:

- Building a one-click "audit prep report" feature that assembles all required documentation by aircraft and date range
- Designing the report output to match the format an FAA inspector expects to see
- Making this feature visible in the demo — "Here's what happens when an FAA inspector shows up tomorrow"

---

## 9. Athelon-Specific Recommendations

### 9.1 Priority Build List for Winning the Demo

1. **Demo environment with realistic data** — 20+ WOs, 8+ aircraft, realistic squawk types, AD items. This is the single highest-ROI investment for the sales process.

2. **Role-based onboarding flows** — detect role at login and serve a relevant first-session path. Admin setup vs. technician task queue vs. inspector sign-off queue.

3. **Activation checklist** — a persistent sidebar checklist that guides a new admin through the first 4 setup phases. Hide it only when explicitly dismissed.

4. **One-click audit prep report** — assemble all maintenance records for a selected aircraft and date range. This feature should be demoed in every enterprise sales conversation.

5. **Offline read access** — at minimum, technicians should be able to view their assigned task cards without WiFi. Full offline write capability is a longer-term investment.

### 9.2 What to Fix Before the First Enterprise Deal

| Issue | Risk | Mitigation |
|---|---|---|
| Empty demo environment | Demo fails to build confidence | Build realistic demo dataset, seed on first load |
| No mobile optimization for shop floor | Technician adoption failure | Audit all core task card flows at 375px width |
| No data import wizard | "We can't migrate" objection kills deals | Build CSV import for aircraft and employee data |
| No in-app documentation | Buyer tests help and finds nothing | Minimum: a contextual help tooltip on every non-obvious field |
| Dashboards show no insights on first login | Blank state signals low product maturity | Sample data + in-dashboard onboarding prompts |

### 9.3 The 90-Day Retention Playbook

The actions that protect renewal should be scripted into the onboarding flow:

- **Day 1**: Admin setup complete + first aircraft registered
- **Day 7**: First 3 technicians active + first week's WOs documented in Athelon
- **Day 30**: Full fleet registered + all active WOs in Athelon + first AD compliance report reviewed with shop manager
- **Day 60**: First full calendar month of work orders completed in Athelon; show the shop manager their cycle time and completion metrics
- **Day 90**: Renewal conversation anchored to metrics from the previous 60 days — cycle time improvement, documentation completeness, time saved vs. paper estimates

At day 90, the shop manager should be able to say: "We processed X work orders, completed Y sign-offs, and we're ready for our next FAA inspection." That is the renewal conversation you want to have.

---

## Sources and Research Basis

This document synthesizes the following research streams:

- **Product-led growth benchmarks**: OpenView Partners PLG framework; Amplitude product analytics research
- **Onboarding best practices**: Appcues user onboarding research; Pendo in-app guidance data (82% TTV improvement cited)
- **B2B SaaS buyer behavior**: UserGuiding B2B onboarding data (550% trial conversion improvement with structured onboarding)
- **MRO software market**: Aircraft IT MRO platform buyer behavior analysis; operator case studies from AirAsia, Southwest Airlines, interCaribbean
- **MRO digitalization landscape**: Oliver Wyman MRO digitalization research; industry analyst reports on paperless maintenance trends
- **Change management**: Prosci change management effectiveness research; enterprise technology adoption patterns
- **UX and accessibility**: WCAG 2.1 AA standard; Nielsen Norman Group B2B enterprise UX research
- **Domain expertise**: FAA Part 145 compliance requirements; AMT certification system and regulatory documentation standards
