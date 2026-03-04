# Athelon — Product Requirements Document, Phase 1
**Author:** Nadia Solis, Product Manager
**Date:** 2026-02-22
**Version:** 0.9 — Internal Review Draft
**Phase:** 1 — Core Data Model & Foundation
**Status:** In Review

---

## Document Purpose

This PRD defines what Phase 1 must accomplish, why it matters, and how we'll know it worked. Phase 1 is explicitly not about shipping user-facing features. It is about getting the data model right before we touch the UI. Everything built in Phase 1 either enables or constrains every feature in Phase 2 through 5. Getting it wrong here has compounding costs.

---

## 1. Problem Statement

### 1.1 What Is Broken in MRO Software Today

Aviation maintenance record-keeping in 2026 is stuck between two bad options:

**Option A: Paper.** Thousands of Part 145 repair stations still run on paper work orders, paper maintenance records, and physical logbooks. The FAA allows this. It works — until it doesn't. Paper records get lost in floods, fires, and moves. Logbook entries are illegible. Traceability from part to work order to aircraft is done by humans with institutional memory. When that human leaves, the knowledge walks out the door.

**Option B: Software that was designed in the 1990s and has been maintained (not redesigned) ever since.** Corridor. EBIS 5. CAMP. These systems carry the DNA of their original design — Windows desktop applications, form-first workflows, print-centric output, no mobile story. They have been extended to meet regulatory requirements as they evolved, but the core interaction model has not changed. They require months of implementation, teams of consultants, and institutional commitment to operate correctly. They work — but they tax the humans who use them.

**The market gap:** There is no modern, mobile-first, cloud-native MRO platform that:
- Achieves the compliance depth of Corridor
- Achieves the scheduling and traceability depth of EBIS 5
- Onboards a small Part 145 in days, not months
- Works on the phone in the technician's hand while they're at the aircraft

This gap exists not because the problem is technically hard (it is not) but because the incumbents have no incentive to cannibalize their own implementation revenue, and because new entrants have consistently underestimated the regulatory depth required to win the FAA compliance argument.

### 1.2 Why Now

Several factors converge in 2026:
1. **Workforce transition:** The average age of A&P mechanics in the US is rising. The next generation entering the workforce grew up with smartphones and finds desktop-first software alienating. Shops increasingly cite "modern software" as a recruitment and retention factor.
2. **Regulatory tailwind:** The FAA has continued to move toward accepting electronic records. The friction against digital adoption is lower than at any prior point.
3. **Cloud cost collapse:** The cost of building and operating a cloud-native platform has dropped to the point where a small team can build something that previously required enterprise infrastructure investment.
4. **Convex specifically:** The real-time, reactive data layer in Convex makes the "live shop dashboard" vision technically achievable without a dedicated WebSocket infrastructure team.

### 1.3 The Customer We're Building For (Phase 1)

**Target segment for Phase 1 validation:** Single-location FAA Part 145 repair station. General aviation focus (piston, light turbine). 3–25 mechanics. One DOM. Owner-operated or owner-managed. Currently on paper OR currently on EBIS 5 OR currently tolerating Corridor costs.

This is not the enterprise segment. We are not trying to win a 200-mechanic heavy maintenance shop in Phase 1. We are trying to prove that the compliance argument can be won at the small repair station level — which is the hardest, most skeptical audience — and then scale up.

---

## 2. User Personas (Brief — Finn Calloway Expanding)

Finn's full persona document is at `/phase-1-data-model/user-personas-ux.md`. These are the brief jobs-to-be-done summaries for PRD purposes.

### Persona 1: The Lead AMT ("Ray")
Senior mechanic, 15–25 years experience. Deeply fluent in whatever system the shop runs. Skeptical of change, but not irrationally so — skeptical because he's been burned by software that made promises and didn't deliver. The gatekeeper to shop-floor adoption.

**Jobs to be done:**
- Log labor time accurately without interrupting his work
- Sign off task cards on his phone from the aircraft, not from a workstation across the hangar
- Find the maintenance history for an aircraft component quickly when he needs it
- Request a part without having to talk to the parts desk

### Persona 2: The Young AMT ("Mia")
3 years post-A&P school. Comfortable with iOS and Android. Frustrated that the shop's software looks worse than the DMV website. Wants to do her job well and finds the tooling demoralizing.

**Jobs to be done:**
- Clock in and out of jobs without a multi-step process
- Take a photo of a discrepancy and attach it to the squawk without emailing it to herself
- Check the status of a parts order without asking the parts manager

### Persona 3: The DOM ("Sandra")
Director of Maintenance. FAA Certificate holder. Personally liable for every signature in the shop. Trusts Corridor's audit trail because she's never had a problem with it. Deeply worried about what an FAA inspection looks like on a new system.

**Jobs to be done:**
- See every open work order and its status from her phone, any time
- Find a specific squawk from 18 months ago in under 2 minutes when an inspector asks for it
- Approve a customer's additional authorization without being physically present in the office
- Generate a certificate of conformance that is correct and complete, every time

### Persona 4: The Parts Manager ("Carlos")
Runs inventory and receiving. Currently lives in spreadsheets. Knows where every part is because it's in his head. Worried about what happens when he's out sick.

**Jobs to be done:**
- Receive a part against a PO and capture the 8130-3 data in under 3 minutes
- See all outstanding parts requests from open work orders in one view
- Know when a part has been on the shelf past its shelf-life limit
- Generate an accurate inventory valuation for the owner at month-end

### Persona 5: The Owner/Operator ("Dale")
Owns the repair station. Cares about billing, utilization, and not getting ramp-checked. Does not use the MRO software directly — but reads the reports. Pays the bills.

**Jobs to be done:**
- Understand shop profitability by work order without asking the DOM
- Know which aircraft are in the shop and at what status, from his phone
- Invoice customers promptly when work is complete
- Not have to explain to his accountant why the books don't match the MRO system

---

## 3. Phase 1 Scope Definition

### 3.1 What Phase 1 Is

Phase 1 is the data model and foundational infrastructure. It is not a user-facing product. At the end of Phase 1:

- The Convex schema handles all 10 core aviation data domains (Aircraft, Work Orders, Task Cards, Parts/Inventory, Personnel, Customers, Squawks, Compliance Records, Maintenance Schedules, Billing)
- The schema is documented, reviewed by Marcus Webb (regulatory), and validated against a sample FAA audit scenario
- Clerk authentication is integrated with role-based access control (at minimum: DOM, AMT, Parts, Owner, Inspector roles)
- The development environment, CI/CD pipeline, and preview deployment infrastructure are operational
- The first synthetic test dataset (representing a 5-aircraft, 8-mechanic Part 145 shop) exists and covers edge cases

### 3.2 What "Getting the Data Model Right" Means

The data model is right when:

1. **It cannot produce a legally invalid maintenance record.** Every required field for a FAA Form 8100-9 or equivalent is captured and enforced at the schema level, not the UI level.

2. **It handles all edge cases from the field.** Deferred maintenance per MEL. Carry-forward discrepancies. Multiple mechanics signing the same task card. A part swapped mid-job. A work order interrupted and returned to 3 weeks later. An aircraft returned to service and then squawked again 2 days later. These are not edge cases in practice — they happen regularly.

3. **It supports the full parts chain.** PO → Receiving → Inspection → Storeroom → Issue → Work Order → Aircraft Record → 8130-3. No shortcuts. No "we'll add that in Phase 2."

4. **It does not assume desktop.** Every data structure, relationship, and query pattern must work for a mobile client making individual, targeted data fetches — not a desktop client that can load an entire record set.

5. **It can be queried for compliance.** A simulated FAA inspector scenario (provide all maintenance records for N123AB for the past 24 months) must return complete, accurate results in under 5 seconds.

### 3.3 Phase 1 Deliverables

| Deliverable | Owner | Target Date |
|---|---|---|
| Competitive teardown (Corridor + EBIS 5) | Nadia Solis | Week 2 |
| PRD Phase 1 (this document) | Nadia Solis | Week 2 |
| User personas (5 detailed) + UX teardown | Finn Calloway | Week 2 |
| Core Convex schema (10 domains) | Rafael Mendoza + Devraj Anand | Week 4 |
| Schema regulatory review | Marcus Webb | Week 5 |
| Clerk auth + RBAC integration | Devraj Anand | Week 4 |
| Infrastructure foundation (CI/CD, environments) | Jonas Harker | Week 3 |
| Synthetic test dataset | Devraj Anand + Cilla Oduya | Week 5 |
| FAA audit simulation test | Marcus Webb + Cilla Oduya | Week 6 |
| Phase 1 retrospective + Phase 2 go-ahead | All | Week 7 |

### 3.4 Exit Criteria for Phase 1

Phase 2 does not begin until ALL of the following are true:

1. ✅ Schema approved by Marcus Webb with no unresolved compliance flags
2. ✅ FAA audit simulation test passes (all required records retrievable, all signatures traceable)
3. ✅ CI/CD pipeline operational: feature branch → preview deployment → production deploy
4. ✅ Role-based access control tested and verified for all 5 personas
5. ✅ At least 3 customer discovery interviews completed with real Part 145 operators
6. ✅ Phase 2 scope is documented and agreed by Nadia, Rafael, and the Orchestrator

---

## 4. Success Metrics for Phase 1

These metrics tell us whether the data model is right. They are verifiable — not aspirational.

### 4.1 Schema Completeness
- **Target:** 100% of fields required for FAA Form 8100-9 (or equivalent RTS documentation) are present and enforced at schema level
- **Measurement:** Marcus Webb's compliance checklist. Pass/fail.

### 4.2 Edge Case Coverage
- **Target:** All 12 identified edge case scenarios produce valid, traceable records without workarounds
- **Measurement:** Cilla Oduya's test suite against synthetic dataset. 12/12 pass.

### 4.3 Query Performance
- **Target:** FAA audit query (all records for one aircraft, 24 months) completes in under 3 seconds
- **Measurement:** Automated performance test in CI.

### 4.4 Mobile Data Feasibility
- **Target:** No schema query requires fetching more than 50KB of data for a single mobile UI screen
- **Measurement:** Devraj reviews each major screen's data requirements against schema. Documented.

### 4.5 Customer Validation
- **Target:** At least 3 Part 145 DOMs or owners review the data model summary (translated into plain language by Nadia) and confirm it covers their core workflows
- **Measurement:** Dovetail research notes. At least 3 sessions.

### 4.6 Onboarding Speed Hypothesis
- **Target:** A test user (Finn Calloway, with no aviation background) can complete the onboarding wizard and create a valid first work order in under 45 minutes
- **Measurement:** Timed usability session with Finn, recorded in Lookback.

---

## 5. Out of Scope for Phase 1

The following are explicitly NOT in scope for Phase 1. This list exists to prevent scope creep and to give the team permission to say "not yet" when someone suggests one of these.

- **Customer-facing portal:** Schema must accommodate it; building it happens in Phase 3 or later.
- **Billing and invoicing UI:** Schema captures all billing data; UI is Phase 4.
- **Integration with QuickBooks, Sage, or any external accounting system:** Out of scope until Phase 4.
- **AI/ML features** (predictive maintenance, anomaly detection, intelligent scheduling): Out of scope until Phase 5 or beyond. Do not design the schema to block these — but do not build toward them in Phase 1.
- **Multi-site operations:** The schema should not make this impossible. Building multi-site support happens in Phase 4.
- **Customer mobile app (aircraft owner self-service):** Not Phase 1. The portal is shop-facing first.
- **Electronic document storage (PDF attachments of 8130-3s, STC data, etc.):** Schema must accommodate document references. Storage architecture is Phase 2.
- **Public API / third-party integrations:** Not Phase 1.
- **Scheduling and resource planning UI:** Data model captures scheduling data; the visual scheduler is Phase 2.

---

## 6. Open Questions Requiring Customer Discovery

These questions cannot be answered from a desk. They require interviews with real Part 145 operators. Nadia is scheduling the first 5 discovery sessions now.

### 6.1 Critical (Block Phase 2 Without Answers)

1. **How do shops handle carry-forward discrepancies in practice?** The FAA rules are clear. The reality in shops often involves workarounds. We need to know what those workarounds look like so the data model supports the actual workflow, not the theoretical one.

2. **What does the aircraft owner authorization flow look like in a small shop?** In a large operation, authorization is formal and documented. In a 5-mechanic shop with a regular customer, "authorization" is sometimes a phone call. How do we make this compliant without making it burdensome?

3. **How do shops handle mechanic certification tracking?** A&P certificates don't expire, but Inspection Authorization (IA) does. Some shops also track manufacturer training, avionics certifications, and type ratings. What does the shop actually need to track, and what can the schema skip?

### 6.2 Important (Inform Phase 2 Design)

4. **What does the daily opening workflow look like for a DOM?** What's the first thing they do when they walk in? What information do they need in the first 10 minutes? This drives the dashboard design.

5. **How do parts orders actually flow in a small shop?** Is it one person or multiple? Does the mechanic request and the parts manager orders? Or does the mechanic order directly? The workflow varies by shop size and will affect the work order → parts → PO data model.

6. **What's the current billing trigger?** When does a shop generate an invoice — at work order close? Daily? At customer request? The answer affects whether we need a "partially invoiced" work order state.

7. **How do shops handle warranty parts returns?** This is a thorny parts traceability case. If a mechanic installs a part and it fails under warranty, the return and replacement creates a complex trail. We need 2–3 real examples before we design this.

### 6.3 Nice to Know

8. What percentage of work orders are for regular customers vs. one-time customers? (Affects how we design the customer relationship model)

9. Do shops track technician efficiency/productivity formally? Or is this informal? (Affects whether labor rate variance reporting is a real need)

10. What report formats do shops currently provide to customers? Plain invoice? Detailed work order breakdown? Certificate of conformance only? (Affects the billing and document generation design)

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema too rigid for edge cases discovered in customer interviews | Medium | High | Build 3 customer interviews into Phase 1 before schema freeze |
| Marcus Webb flags compliance issue that requires schema rework | Low | High | Marcus reviews schema at Week 3 (mid-point), not just at completion |
| Onboarding wizard too complex for non-technical DOM | Medium | Medium | Finn designs wizard flow before engineering builds it |
| Convex real-time subscriptions create performance issues at schema scale | Low | High | Devraj stress-tests subscription patterns at synthetic dataset scale |
| Switching conversation with early customers requires features not in Phase 1 | High | Medium | Nadia scripts clear "what Phase 1 is / what's coming" narrative for pilot conversations |

---

*This is a living document. Nadia Solis owns it. Questions go to her first, then to the Orchestrator if unresolved.*

*Version history tracked in Linear. Current version: 0.9. Target for Phase 1 review approval: Week 2.*
