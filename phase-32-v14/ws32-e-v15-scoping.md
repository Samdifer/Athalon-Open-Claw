# WS32-E — v1.5 Scoping Session
**Session date:** 2026-07-01
**Format:** In-person (Athelon workspace, Denver CO) + video for remote attendees
**Facilitator:** Nadia Solis
**Attendees:** Nadia Solis (Program Director), Marcus Webb (Compliance), Devraj Anand (Engineering Lead), Cilla Oduya (QA/Test Lead), Jonas Harker (Release/Infrastructure)
**Duration:** 3 hours 20 minutes
**Status:** ✅ DONE

---

## §1. Context: Where v1.4 Left Us

The v1.4 development arc (Phases 29–32) was organized around a single theme: making the ALS compliance lifecycle a first-class, platform-native capability rather than a manual tracking problem.

**What v1.4 delivered:**
- F-1.4-A: Repetitive AD interval tracking — the system now owns the compliance date calculation, not the DOM
- F-1.4-B: Shop-Level ALS Compliance Dashboard — fleet compliance in one view
- F-1.4-C: Turbine-Type ALS Template Library — C208B, TBM 850, Bell 206B, S-76C, R44 pre-built
- F-1.4-D: Part 145 certificate number on all maintenance releases
- F-1.4-E: Procurement Lead Time Awareness — order before you're behind the power curve
- F-1.4-F: Maintenance Event Clustering — reduce hangar entries, plan around the schedule

**What v1.4 did NOT address:**
- What happens when the regulatory document itself changes (AD amendments, SB revisions)
- What a DOM can see *across* shops, not just within their own
- What an FSDO investigator needs when they walk in the door
- What Priya Sharma's Part 135 operation specifically needs that v1.4 didn't deliver
- What a shop owner learns from trends over time, not just point-in-time snapshots

The v1.5 scoping session starts from these gaps.

---

## §2. Feature Candidates — Discussion

### §2.1 Candidate A: Regulatory Change Tracking

**Introduced by:** Marcus Webb
**Reference:** FR-32-02 (Dale Renfrow's borescope protocol observation) + Phase 27 FSDO readiness work

**Marcus's framing:** "Every v1.4 feature assumes the regulatory document is static. It isn't. ADs get amended. Cessna issues new service bulletin revisions. The P&WC CMM gets a new revision that changes a life limit. Right now, when that happens, the DOM has to notice, know it applies to their aircraft, and manually update their ALS board. That is exactly the kind of manual task that Athelon is supposed to eliminate. We need a change-tracking layer."

**Discussion:**

*Devraj:* "What's the data source for regulatory changes? FAA AD database has an API — I've looked at it. The issue is cross-referencing FAA AD records to specific aircraft tail numbers in our system. If a new AD for the PT6A-114A drops, I need to know it applies to N416AB and surface it to Dale Renfrow. That's a matching problem, not just an API problem. The AD applicability statement is semi-structured text and requires interpretation."

*Marcus:* "For ADs, you're right — full automation is hard. But the alert layer doesn't have to be fully automated. It can be: 'A new AD has been issued for the PT6A-114A engine family. Review applicability to your N416AB.' The DOM confirms whether it applies. The system surfaces the alert. That's better than the DOM not knowing the AD exists."

*Cilla:* "This has a significant test surface. Every aircraft type, every engine type, every existing ALS item — all of them are potentially affected by a regulatory change event. Testing the alert logic alone is a multi-week TC build."

*Nadia:* "Log it. This is the highest-compliance-impact candidate on this list. It belongs in v1.5."

**Priority/Effort assessment:**
- Compliance impact: **CRITICAL** (this is the most safety-significant gap)
- Engineering effort: **LARGE** (AD API integration + applicability matching + alert distribution + user confirmation workflow)
- v1.5 fit: **YES — anchor feature**

---

### §2.2 Candidate B: FSDO Audit Export Improvements

**Introduced by:** Marcus Webb
**Reference:** Phase 27 WS27-C (Desert Sky Turbine FSDO audit readiness); Phase 28 WS28-B (FSDO Audit Export feature F-1.3-D)

**Marcus's framing:** "F-1.3-D shipped a basic FSDO export. Frank Nguyen used it in his FSDO readiness exercise. His feedback was that the export covers maintenance records well but doesn't address the audit inspector's primary compliance question for a Part 145 shop: 'Show me your certificate, your procedures manual, your personnel records, and your open discrepancy list.' The current export doesn't bundle the procedures manual reference or the personnel cert file. An FSDO walk-in today would get the maintenance records from Athelon and then have to hunt down the rest from paper."

**Discussion:**

*Jonas:* "Personnel cert records — IA certificates, A&P certificates, repairman certs — those are uploaded as documents in the personnel profile. They're in the system. They're just not included in the FSDO export bundle. Adding them is not architecturally complex; it's a new export template."

*Devraj:* "The procedures manual is trickier — most shops don't have their procedures manual in Athelon. It lives in a binder. We'd need a document storage feature or at least a 'link to external document' field that populates in the export."

*Marcus:* "I'd settle for a document link in the export. 'Procedures manual: [link or location].' At least the export tells the FSDO inspector where to look."

*Cilla:* "This is medium effort, high compliance value. And it's well-scoped. I'd prioritize this."

**Priority/Effort assessment:**
- Compliance impact: **HIGH** (FSDO readiness is real; every Part 145 shop faces this)
- Engineering effort: **MEDIUM** (export template + personnel cert bundle + document link field)
- v1.5 fit: **YES — high-value, medium effort**

---

### §2.3 Candidate C: Part 135 Deeper Integration

**Introduced by:** Nadia Solis
**Reference:** Priya Sharma's ongoing friction with Athelon's Part 135 surface; FR-32-01 through FR-32-04 implicitly expose a turbine charter gap (Lorena Vásquez will be the next Part 135 shop)

**Nadia's framing:** "Priya has been on the platform since Phase 22. She was our Part 135 proof-of-concept. The honest assessment is that she uses Athelon for maintenance records and the pilot notification log — full stop. The ops spec integration, the MEL tracking, the certificate holder separation we built in Phase 25 — she's barely touched any of it. Either we built the wrong features for Part 135 or we built them in a way that's too cumbersome for her to actually use. Before we onboard Lorena's King Air charter operation in Phase 33, we need to understand what Part 135 shops actually use day-to-day."

**Discussion:**

*Marcus:* "Part 135 shops have three compliance categories that are structurally different from Part 145: MEL management, pilot qualification tracking (part 135.293/135.297 checking), and ops spec conformance. We built MEL and pilot tracking. Priya's not using them. My guess: the MEL interface is too complex for a small charter operator who manages MELs out of a binder. Pilot qualification checking — Priya does that manually because her scheduler is also her pilot records admin. We built a system; she kept her process."

*Devraj:* "The pilot portal — we built a dedicated interface for pilots to view their own qualification status. How many logins has Priya's pilot portal seen?"

*[No one knows the exact number; consensus is it's been used rarely.]*

*Jonas:* "I can pull the metric. But the right move is to get Priya on a call before we scope v1.5 Part 135 features. Build from her actual friction, not from our assumptions about what she needs."

*Nadia:* "Agreed. Priya call happens before Phase 33 planning. But Part 135 depth is in the v1.5 backlog — it has to be, especially with Lorena coming in."

**Priority/Effort assessment:**
- Compliance impact: **HIGH** (Part 135 compliance is safety-critical; underserved shops create risk)
- Engineering effort: **LARGE** (requires discovery phase before scope is clear)
- v1.5 fit: **CONDITIONAL — needs discovery call with Priya first; then scope**

---

### §2.4 Candidate D: Multi-Shop Analytics / Cross-Fleet Insights

**Introduced by:** Devraj Anand
**Reference:** FR-32-04 (Dale Renfrow's request for turbine type trend data); long-standing Nadia ambition for DOM-level cross-fleet view

**Devraj's framing:** "We have 7 shops, 32 aircraft, 487 ALS items. That's not enough data for statistical significance on engine wear rates — but it's enough for pattern detection. Right now, each DOM can only see their own fleet. Nadia, as program director, can't see across shops at all from within the product. There's no place where someone can look at all Caravan operators and say 'the average fuel selector valve replacement happens at 11,400 cycles, not 12,000.' That kind of insight is valuable both for our customers and for our product roadmap."

**Discussion:**

*Marcus:* "Cross-shop data access is a compliance and privacy landmine. Shop A cannot see Shop B's maintenance records. Ever. Not the work order details, not the tail numbers, not the specific findings. That's a HIPAA-equivalent concern for aviation data — it's trade secrets and liability exposure."

*Devraj:* "Agreed. The analytics layer would have to be aggregated and anonymized. 'Of 5 C208B operators, average fuel selector valve remaining life at last inspection: X cycles.' No tail numbers. No shop names. Just aggregated type data."

*Marcus:* "Aggregated anonymized analytics — I can work with that. But it needs to be an explicit data sharing consent. Each shop agrees that their anonymized data contributes to benchmarking. They can opt out."

*Cilla:* "This is architecturally significant. It requires a separate analytics backend that is isolated from the operational data. This isn't a sprint feature — this is a Phase 33+ investment."

*Nadia:* "It goes in the backlog as a longer-horizon candidate. Not v1.5 sprint one, but it shapes the data architecture decisions we make in v1.5."

**Priority/Effort assessment:**
- Compliance impact: **MEDIUM** (advisory/operational; no direct regulatory compliance surface)
- Engineering effort: **VERY LARGE** (new data architecture, consent model, analytics backend)
- v1.5 fit: **MEDIUM HORIZON — architectural investment, not sprint 1**

---

### §2.5 Candidate E: Seasonality-Aware Utilization Modeling

**Introduced by:** Nadia Solis (from FR-32-01 — Dale Renfrow's check-in)
**Reference:** WS32-C §2.5

**Nadia's framing:** "Dale's complaint about the 90-day utilization average is legitimate. Fire suppression Caravans fly 4–5 cycles a day in summer and 1 cycle every 3 days in January. The current model doesn't know that. The 'days to limit' estimate is meaningfully wrong in both directions depending on season. This affects every turbine shop we have — RMTS, Ridgeline, Desert Sky Turbine."

**Discussion:**

*Devraj:* "The engineering path is clear. We add a utilization profile per aircraft: 'busy season utilization rate' and 'off-season utilization rate' with a monthly calendar showing which months are which. The dashboard uses the relevant rate for the current month. Alternatively, we let the DOM set a manual override for the estimate window — 'use last 30 days instead of 90 days.'"

*Cilla:* "The simpler version — a user-controlled estimate window — is a one-sprint feature. The seasonality profile is a two-sprint feature. I'd start with the window control and see if that satisfies the DOM complaints."

*Jonas:* "I can ship the window control in a hotfix cadence. It's a config setting, not a new feature surface."

*Nadia:* "Move it to the v1.4.x hotfix track, not v1.5. This shouldn't wait for the full v1.5 release."

**Priority/Effort assessment:**
- Compliance impact: **MEDIUM** (estimate accuracy; not a compliance-blocking issue, but affects operational decisions)
- Engineering effort: **SMALL to MEDIUM** (configurable window: small; full seasonality profile: medium)
- v1.5 fit: **MOVE TO HOTFIX TRACK — ship configurable window as v1.4.x; seasonality profile to v1.5 if still needed**

---

### §2.6 Candidate F: Mobile Ramp-View — Quick ALS Status Card

**Introduced by:** Nadia Solis (from FR-32-03 — Dale Renfrow's check-in)
**Reference:** WS32-C §2.5

**Nadia's framing:** "Dale wants one tap to see the ALS status of a specific aircraft on the ramp. He's doing a pre-departure check. He wants DUE_SOON and COMPLIANT for the top items. Three taps and two load times is two steps too many."

**Discussion:**

*Jonas:* "This is a mobile UX prioritization issue, not a backend feature. The data is already there. We need a pinned shortcut to a simplified aircraft ALS summary card. Similar to the Android/iOS home screen widget concept — a persistent quick-access card."

*Devraj:* "I'd build it as a configurable dashboard widget on the mobile home screen. The DOM pins specific aircraft. The card shows: aircraft tail, top 3 DUE_SOON items (if any), days to next event. One tap opens the full ALS board."

*Cilla:* "Mobile widget testing is always painful. Platform-specific behavior for iOS and Android. But the scope is small."

**Priority/Effort assessment:**
- Compliance impact: **MEDIUM** (operational efficiency; supports compliance decisions in real time)
- Engineering effort: **MEDIUM** (mobile widget implementation + test matrix across platforms)
- v1.5 fit: **YES — v1.5 sprint 1 candidate**

---

### §2.7 Candidate G: Cross-Shop Protocol Sharing

**Introduced by:** Marcus Webb (from FR-32-02 — Dale Renfrow's check-in)
**Reference:** WS32-C §2.5

**Marcus's framing:** "Dale pointed out that the PT6A-114A borescope protocol PROTO-RMTS-001 is shop-specific. If Curtis Pallant wants the same protocol for his N88KV, he builds it from scratch. That's redundant and introduces divergence risk — the same engine type might be inspected to slightly different protocol standards depending on who built the shop's protocol and when.

"The right model: inspection protocols for a specific engine type should be authoritative at the engine-type level in Athelon, with shop-level customization permitted on top of the base protocol. Think of it like a template library but for protocols."

**Discussion:**

*Devraj:* "Architecturally this is a 'protocol template' layer. Like our ALS item template library — we have a base template per aircraft type, shops can customize. Protocol templates would work the same way: a base PT6A-114A borescope protocol, shops can extend or modify for their specific workflow."

*Marcus:* "Critical constraint: the base protocol needs to be marked as the regulatory-minimum floor. A shop can add steps; they cannot remove required steps without DOM authorization and a documented rationale. The protocol is a maintenance document."

*Cilla:* "Testing the protocol template inheritance rules — that's complex. I'd want at least two sprints for this feature."

**Priority/Effort assessment:**
- Compliance impact: **HIGH** (inspection protocol standardization directly affects maintenance quality and audit defensibility)
- Engineering effort: **LARGE** (protocol template architecture + inheritance rules + permission model + test surface)
- v1.5 fit: **YES — v1.5 sprint 2+ candidate**

---

## §3. v1.5 Feature Backlog — Prioritized

Nadia facilitated a final prioritization pass using Marcus's compliance impact ratings and Devraj's engineering effort estimates.

| Rank | Feature | Priority (Compliance) | Effort (Eng) | v1.5 Sprint |
|---|---|---|---|---|
| 1 | **A: Regulatory Change Tracking** (AD/SB amendment alerts) | CRITICAL | LARGE | Sprint 2–3 (backend + alert layer) |
| 2 | **B: FSDO Audit Export Improvements** (personnel certs + procedures manual link) | HIGH | MEDIUM | Sprint 1 |
| 3 | **G: Cross-Shop Protocol Sharing** (engine-type protocol templates) | HIGH | LARGE | Sprint 2–3 |
| 4 | **C: Part 135 Deeper Integration** (after Priya discovery call) | HIGH | LARGE | Sprint 3+ (scope after discovery) |
| 5 | **F: Mobile Ramp-View Quick ALS Card** | MEDIUM | MEDIUM | Sprint 1 |
| 6 | **E: Seasonality Utilization Modeling** | MEDIUM | MEDIUM | Hotfix track / Sprint 1 |
| 7 | **D: Multi-Shop Analytics** (aggregated, anonymized, consent-based) | MEDIUM | VERY LARGE | Phase 33 architecture investment |

---

## §4. v1.5 Theme Statement

**Proposed by Nadia; approved by full team.**

> **v1.5 Theme: "The Platform Knows When Things Change"**
>
> v1.4 made the compliance lifecycle platform-native: once you're in Athelon, the system tracks what you have and alerts you when limits approach. v1.5 makes the platform aware that the compliance landscape itself is not static. Regulations change. Inspection protocols evolve. Shop teams grow and restructure. An audit happens. v1.5 is the release that makes Athelon responsive to change — in the regulatory environment, in the shop's operational context, and in the inspector's walk-in scenario.
>
> This is not an incremental feature release. It is a behavioral shift: from a system that knows what you've done to a system that tells you what's different.

---

## §5. Pre-v1.5 Action Items

| Item | Owner | Due |
|---|---|---|
| Priya Sharma discovery call (Part 135 depth scoping) | Nadia Solis | 2026-07-15 |
| v1.4.x hotfix — configurable utilization estimate window | Devraj + Jonas | 2026-07-10 |
| Lorena Vásquez discovery call (Phase 33 candidate) | Nadia Solis | 2026-07-07 |
| PT6A-42 template scoping (Marcus, for King Air B200 onboarding) | Marcus Webb | 2026-07-20 |
| FAD AD API integration spike (Devraj, for Candidate A scope) | Devraj Anand | 2026-07-20 |

---

## §6. v1.5 Not-Included (Descoped)

The following candidates were discussed and explicitly descoped from v1.5 planning:

| Feature | Reason Descoped |
|---|---|
| Customer / owner portal enhancements | Adoption data suggests the portal is underused (Priya's experience). Redesign should follow the Part 135 discovery findings, not precede them. |
| Offline mode improvements | v1.1 offline mode is stable. No shop has reported offline reliability issues since Phase 21. Not a priority. |
| Repairman cert employer transition | F-1.3-E shipped and closed OPEN-2C-01. No new reports. Not a priority. |

---

*WS32-E complete. v1.5 feature backlog finalized. Theme statement approved. Seven candidates ranked; Regulatory Change Tracking is the anchor feature. v1.5 scoping session closed 2026-07-01.*
