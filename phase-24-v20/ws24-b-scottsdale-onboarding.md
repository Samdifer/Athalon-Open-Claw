# WS24-B — Desert Sky Turbine: Scottsdale Onboarding
**Filed:** 2026-02-23T01:29:00Z  
**Shop:** Desert Sky Turbine — Scottsdale, AZ  
**DOM:** Frank Nguyen, 31-year veteran, former FAA Designated Engineering Representative  
**Personnel:** 12 certificated (A&P, IA, Powerplant specialists)  
**Primary Fleet:** King Air 350 (primary), Piper Cheyenne II/IIIA  
**Onboarding Lead:** Nadia Solis + Rosa Eaton  
**Reference Customer Call:** Erik Holmberg (Wichita)  
**Status:** ✅ ONBOARDED

---

## Background

Desert Sky Turbine is the shop Nate Cordova mentioned by name in the months following Phase 15. Nate knew Frank Nguyen professionally — two powerplant specialists in the Arizona/Southwest turbine world who had crossed paths at King Air service seminars over the years. When the dispatches started circulating, Nate knew Frank would read them. He did.

Frank read all five dispatches. He read the technical content carefully. He did not reach out until Dispatch-21, when Nate's mention of the LLP dashboard — specifically the part about correcting the Seneca II engine mount life count — gave him enough to go on. A DER doesn't reach out on enthusiasm. A DER reaches out when he's satisfied that the technical claim is plausible and the compliance architecture is serious.

Frank's email to Nadia was three sentences. He said he'd been following the Athelon story. He said he ran a King Air shop with 12 certified personnel. He said he wanted to talk, but he had regulatory questions, not product questions.

Nadia cleared her calendar.

---

## Frank's First Call with Nadia

The call was scheduled for 30 minutes. It ran 97 minutes. Nadia had prepared a standard product walkthrough. She never opened it.

Frank's first question: "Who designed the compliance architecture?"

Nadia told him about Marcus Webb — the aviation attorney turned compliance architect, the decision not to build without one, the Phase 4 ferry permit gate, the IA re-auth mechanism.

Frank: "What's the IA re-auth mechanism?"

Nadia walked him through it: per-signature re-authentication using Clerk session tokens, not session-level auth. Every return-to-service signature requires fresh authentication. AC 120-78B framing. Dale Renfrow's SME brief.

Frank was quiet for a moment. Then: "Has the compliance architecture been reviewed by anyone with FAA experience? Not just someone who knows the regulations — someone who's worked inside the system?"

Nadia told him Marcus had been her primary compliance architect from the start. She said Marcus's approach had been to build the system as if it would be audited, not as if it would pass an audit. Then she said: "If it would help, I can get Marcus on the call."

Frank said it would help.

Nadia messaged Marcus. Marcus joined within four minutes.

What followed, by Nadia's account, was the most technically substantive conversation Athelon had ever had with a prospective customer. Frank asked Marcus about the §43.9 record retention model. About how the mutation audit trail handled amended records. About the Form 337 major/minor classification workflow. About what happened to an AD compliance record if the aircraft changed owners. About whether the pilot notification log was scoped to the certificate holder or to the aircraft.

Marcus answered every question directly. When he didn't know the specifics of the implementation, he said so and described what the implementation needed to do. When Frank pushed on an edge case, Marcus acknowledged the edge case and described the guardrail that covered it — or the gap that didn't yet have a guardrail.

Frank asked about the ferry permit. Marcus said: "That type is disabled. We haven't designed the guardrails yet." Frank's response, verbatim per Nadia: "Good answer."

At the end of the call, Frank said he wanted to onboard. He said he had one condition: he wanted the Day 1 session to be a compliance-architecture walkthrough, not a product demo. He could learn a UI. He needed to understand whether the system would survive a Part 145 FSDO audit before he put aircraft records into it.

Nadia agreed immediately.

---

## Day 1 — LLP Baseline Audit

**Date:** 2026-02-09  
**Participants:** Frank Nguyen (DOM), three Desert Sky lead mechanics, Nadia Solis, Rosa Eaton, Erik Holmberg (reference customer, on call)

The Day 1 session ran from 8:00 AM to 5:30 PM with a 30-minute lunch.

### Morning: Compliance Architecture Walkthrough

Rosa ran the compliance walkthrough. Frank had printed the regulatory sections he wanted to validate against — §43.9, §43.11, §65.95, Part 145 §145.219, and the IA re-auth AC. He cross-referenced them against the Athelon workflows Rosa walked him through.

Frank's questions were precise and specific. He did not ask about the UI. He asked about what happened to a record when it was amended, who could amend it, and what the audit trail showed. He asked whether the system enforced the distinction between a major and minor repair at the record level or only at the UI level. He asked whether the IA's re-auth token was scoped to the specific work order or to the session.

Rosa and Nadia answered. When a question touched implementation specifics, Nadia messaged Devraj, who was on standby and answered within minutes.

By midday, Frank had signed off on the compliance architecture verbally. Not enthusiastically — he doesn't do enthusiasm — but specifically. "The IA re-auth is correct. The §43.9 record structure is correct. The audit trail handles amended records correctly. I'm satisfied."

Rosa noted afterward: "He wasn't looking for a product he liked. He was looking for a product he could defend to an FSDO inspector. Those are different tests."

### Midday: Erik Holmberg Reference Call

Erik Holmberg joined by phone for 45 minutes over lunch. Frank wanted to hear from a working A&P/IA powerplant specialist who had used the LLP dashboard in production.

Erik walked Frank through the High Desert MRO experience — the Seneca II engine mount life count correction on Day 1, the progressive inspection workflow, the offline mode experience. He talked about the LLP dashboard from a technician's perspective, not a DOM's.

Frank asked Erik one question: "Have you ever found a case where the system let you do something you shouldn't have been able to do?"

Erik thought about it. He said: "No. The opposite has happened — it stopped me from doing something I thought was allowed. Which turned out to be correct."

Frank thanked him. Erik signed off.

### Afternoon: LLP Baseline Audit — King Air 350 Fleet

Desert Sky operates four King Air 350s and three Piper Cheyenne IIIA aircraft. The afternoon session was a live LLP baseline entry for the King Air fleet.

Turbine aircraft LLP complexity is categorically higher than piston GA. The King Air 350 (PT6A-60A engines) has life-limited parts tracked by:
- Engine total time
- Engine cycles (start/stop)
- Hot section inspections
- Prop strikes (event-based)
- TBO intervals (calendar and hours)

Desert Sky had been maintaining paper records for LLP tracking and an Excel workbook that Frank described as "accurate but not auditable." The workbook had been maintained by Frank personally for 11 years. Every number in it was correct. None of it had timestamps, version history, or attribution.

Rosa noted the parallel to the High Desert Seneca discovery immediately. She said nothing until Frank said it himself: "I've trusted this workbook because I built it. That's the wrong reason to trust a record."

The LLP baseline audit took four hours. Twelve personnel contributed component-by-component verifications. Three components required retrieval of physical logbooks that had been in storage. Every discrepancy between Frank's workbook and the physical logbooks was documented, traced to root cause, and entered with full attribution.

**Total components entered:** 847 life-limited part records across seven aircraft  
**Discrepancies found:** 11  
**Most significant:** One PT6A-60A first-stage power turbine blade set on N8814KA showed a 37-hour overage in Frank's workbook vs. the physical engine logbook — the workbook had applied a partial-hour rounding convention that Frank had established in 2018 and subsequently forgotten. The physical logbook showed the correct unrounded hours. The blade set was due for inspection in 143 hours (workbook) or 106 hours (actual). Frank immediately flagged the aircraft for priority inspection scheduling.

Frank's response to the 37-hour discrepancy: He didn't defend the workbook. He said: "This is why I called."

---

## First Work Order — King Air 350 Progressive Inspection

**Aircraft:** N8814KA (the same King Air with the PT6A discrepancy)  
**Work Order Type:** Progressive Inspection, Phase 2 of 4  
**Assigned IA:** Frank Nguyen (DOM/IA)  
**Complexity:** Multiple LLPs tracked, one active turbine AD, one turbine component inspection triggered by the Day 1 LLP audit

### The First Turbine AD in Athelon Production

Desert Sky's current AD stack included AD 2024-09-07, applicable to PT6A series engines — a mandatory inspection of the fuel control unit metering valve stem for wear. This was the first turbine-type AD that Athelon had processed in production. (Skyline and High Desert work primarily piston GA; Priya's Part 135 aircraft are piston twin.)

The AD compliance module handled the turbine AD without schema modification, as planned — AD type is aircraft-specific, not engine-category-specific. Frank walked through the AD entry himself: AD number, applicability determination, compliance method, inspection interval, and documentation requirement. He cross-referenced the FAA AD database printout against what Athelon recorded.

His assessment: "The fields are correct. The applicability logic is correct. The compliance state machine is correct." He paused. "That's not a compliment, by the way. That's the minimum bar."

Nadia took it as a compliment.

The progressive inspection work order was created, task cards executed across four days, and the return-to-service signature completed by Frank as the certifying IA on 2026-02-14.

First turbine AD processed in Athelon production: **AD 2024-09-07. Status: COMPLIANT.**

---

## Frank's Verdict — Week 1

Frank submitted his week-1 assessment in writing on 2026-02-16. It read in part:

> "The compliance architecture is sound. The IA re-auth mechanism is the most important feature in the product and I'm satisfied it works as described. The LLP dashboard is the second most important feature for a turbine shop and it handles the King Air component model correctly.
>
> My one concern going in was that Athelon had been designed by people who understood the regulations but had not worked inside the regulatory system. After speaking with Marcus Webb and watching the product handle a real turbine AD, I'm less concerned about that. The compliance architecture reflects genuine regulatory knowledge, not just regulatory familiarity.
>
> I will qualify my assessment: I've been using this product for seven days. Seven days is not an FSDO audit. But in seven days, I haven't found anything that would fail an FSDO audit. I've found one thing I'd do differently — I've filed it as product feedback."

---

## Frank's Formal Product Feedback

Frank filed his product feedback on 2026-02-15 — one day before his week-1 assessment, because a former DER files product feedback with reference numbers and structured descriptions, not in the body of a general assessment email.

**Feedback Reference:** DST-FB-001  
**Filed by:** Frank Nguyen, DOM — Desert Sky Turbine  
**Date:** 2026-02-15  
**Classification:** Non-blocking improvement request

**Title:** AD applicability determination field does not capture the basis for a negative applicability determination

**Description:**  
When an AD is assessed as "not applicable" to an aircraft, Athelon records the determination and the date. It does not require or capture the basis for the negative determination — specifically, whether the non-applicability is based on (a) aircraft serial number exclusion, (b) engine serial number exclusion, (c) configuration exclusion (e.g., aircraft modified under an STC that renders the AD inapplicable), or (d) a DER or DAR determination that the AD does not apply based on design analysis.

During an FSDO audit, an inspector will ask why a given AD was marked not applicable. The current Athelon record answers "it was marked not applicable on [date] by [name]." It does not answer "because [specific basis]." For piston GA, that may be sufficient. For a turbine shop with complex STC modifications and configuration-specific AD applicability, the basis for a negative determination is auditable and should be captured.

**Recommended resolution:**  
Add a `nonApplicabilityBasis` field to the AD compliance record with the following enum options: `SERIAL_NUMBER_EXCLUSION`, `ENGINE_SERIAL_NUMBER_EXCLUSION`, `STC_CONFIGURATION_EXCLUSION`, `DER_DETERMINATION`, `OTHER` (with required text). Make this field mandatory when `complianceStatus` is set to `NOT_APPLICABLE`. Existing NOT_APPLICABLE records should be flagged for DOM review and basis entry.

**Impact assessment:** Non-blocking. Current records are defensible in audit but not as robust as they could be. This is a depth-of-audit-defense issue, not a compliance gap.

**Frank's note:** "I'm filing this as formal product feedback because that's what it is. I don't use the word 'formal' loosely. If you fix this, tell me when it ships."

---

## Status

**✅ ONBOARDED**

| Item | State |
|---|---|
| Frank's first call (regulatory qualification) | ✅ COMPLETE |
| Marcus consultation on compliance architecture | ✅ COMPLETE |
| Day 1 compliance walkthrough (Rosa Eaton) | ✅ COMPLETE |
| LLP baseline audit — 7 aircraft, 847 components | ✅ COMPLETE |
| Discrepancies found and documented | ✅ 11 discrepancies, all resolved |
| Critical LLP discrepancy (N8814KA, 37hr overage) | ✅ DOCUMENTED — aircraft flagged for priority inspection |
| First work order (progressive inspection, N8814KA) | ✅ COMPLETE — RTS signed by Frank Nguyen |
| First turbine AD processed in production | ✅ AD 2024-09-07, COMPLIANT |
| Frank's week-1 verdict | ✅ FILED |
| Frank's formal product feedback | ✅ FILED — DST-FB-001 |
| Desert Sky Turbine: production status | ✅ LIVE |
