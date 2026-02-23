# WS32-C — RMTS 30-Day Operational Check-In
**Shop:** Rocky Mountain Turbine Service (RMTS)
**Contact:** Dale Renfrow, DOM
**Check-in date:** 2026-06-20 (30 days post-WO-RMTS-003 closure, 2026-05-07)
**Format:** Video call, 52 minutes
**Attendees:** Nadia Solis (Athelon), Marcus Webb (Athelon, partial — first 20 minutes), Dale Renfrow (RMTS)
**Status:** ✅ DONE

---

## §1. Background

WO-RMTS-003 (N416AB fuel selector valve P/N 9924721-1 replacement) was closed on 2026-05-07 — the first ALS-triggered part replacement tracked end-to-end through Athelon. Dale Renfrow performed the DOM sign-off. Hector Ruiz (lead mechanic, AP-CO-9871) performed the work. The system drove every step: procurement, scheduling, work order creation, ALS counter reset, and maintenance release.

The 30-day check-in (OI-32-03) was scheduled to give Dale a structured opportunity to report on Athelon's performance in a turbine-only shop environment since WO-RMTS-003 and since RMTS came live in Phase 29.

The check-in also coincided with v1.4.0 release day. Dale's UAT smoke test (WS32-A §4.1) was folded into the first 35 minutes of the call; the check-in conversation ran for the final 52 minutes.

---

## §2. Call Notes — v1.4.0 UAT and Check-In

### §2.1 v1.4.0 UAT (First 35 Minutes — documented in WS32-A)

Dale confirmed UAT for the Shop ALS Compliance Dashboard (F-1.4-B), Procurement Lead Time Awareness (F-1.4-E), and Repetitive AD Tracking (F-1.4-A). ✅ APPROVED (see WS32-A §4.1).

### §2.2 Check-In — What Has Worked Well (Nadia's question: "If you're being honest with a colleague, what's the headline?")

**Dale:** "The headline is that I trust the numbers more than I trusted my spreadsheet. That's not a small thing. I've been running RMTS for eleven years. I've run it with paper cards, with Excel, with QuickBooks, with a system called AeroPlan that I paid real money for. I've never said that about any of them."

**Nadia:** "What specifically drives that trust?"

**Dale:** "The fuel selector valve sequence. When the ALS audit [WS30-A, N416AB C208B] ran in April, the system told me N416AB's valve was at 160 cycles remaining. I had 160 on my spreadsheet too — but I had it because I calculated it myself. The system had 160 because it calculated it from the work order hours entered by Hector, which were entered from the logbook. There was no 'I think it's 160.' There was a chain of evidence. The system tracks what was done, not what I remember."

**Nadia (noted for v1.5 scoping):** "Chain of evidence" framing — Dale is articulating the audit trail value instinctively. This is a product narrative, not just a feature description.

---

### §2.3 Check-In — ALS Audit Experience (Specific)

**Nadia:** "Walk me through the April ALS audit experience from your side."

**Dale:** "Marcus showed up [on video call] knowing more about the PT6A-114A LLP table than most mechanics I've met in person. The first thing he did was ask me to pull the engine logbook — not the maintenance card, the actual logbook. That was the first signal that this was going to be different. We went through 29 items. Every item, Marcus either confirmed the limit from the Cessna D2101-13 or called out where the ICA reference was. I'd never had anyone do that with me in real time. I always felt like ALS tracking was something I did alone in my office late at night.

"The fuel selector valve finding — 160 cycles remaining on a 12,000-cycle part — that was in the audit. I knew the number was approaching. I didn't know it was that close. When Marcus said 'you need to order this part now because the lead time is approximately 30 days,' that was the moment I understood what the procurement awareness feature was for. It wasn't telling me something I didn't know in theory. It was doing the math I was too busy to do."

**Marcus (on the call at this point):** "You ordered the valve the next day, from Rocky Mountain Aircraft Parts, KGJT. It arrived in 12 days. We installed it [WO-RMTS-003] 20 days before the limit. That sequence worked."

**Dale:** "It worked exactly as designed. I'm not going to pretend that felt routine, because it didn't. It felt like a close call handled correctly."

---

### §2.4 Check-In — Borescope Protocol (Specific)

**Nadia:** "You've had the combustion liner borescope protocol [PROTO-RMTS-001] filed since May. Has the protocol system been useful?"

**Dale:** "Useful is putting it mildly. I've done four borescopes on the PT6A-114A since the protocol was filed. Every one went into the Athelon work order, and every one referenced PROTO-RMTS-001 automatically. I don't think about the protocol number anymore. It's just there.

"What changed — and this took me a few weeks to notice — is that I'm not writing notes about what I checked and what I found in a separate document anymore. It all goes in the work order, organized the same way every time. Hector commented on it. He said, 'Dale, the way these records look now is how I always thought maintenance records were supposed to look.' That's from a mechanic who's been doing this for 22 years."

---

### §2.5 Check-In — Friction and Rough Edges (Nadia: "What doesn't work the way you want it to?")

**Dale:** "I'm going to give you three things and I want you to write them down.

**1. The daily utilization estimate on the dashboard is wrong for RMTS.**

The ALS Compliance Dashboard [F-1.4-B] estimates time to limit based on the last 90 days of work order hours. RMTS is seasonal. My June utilization is completely different from my January utilization. In June, N416AB is running cargo and firefighting support — 4, 5 cycles a day. In January, it might be 1 cycle every 3 days. A 90-day average smooths that out but gets it wrong in both directions. In summer, the 'days to limit' estimate is too optimistic. In winter, it's too conservative.

I want a utilization model that accounts for seasonality. Or at least let me set a 'busy season multiplier' so the estimate is honest about what 'busy season' means for my operation."

**Nadia (logged as FR-32-01 for v1.5 scoping):** Seasonality-aware utilization modeling for dashboard estimates.

**Dale:** "2. The borescope protocol is PROTO-RMTS-001. Why is it RMTS-specific? If Curtis at Ridgeline wants to do a PT6A-114A borescope — same engine — why does he have to re-build the protocol? The protocol should live at the engine type level, not the shop level. I should be able to share a protocol with another shop that has the same engine type. Not share my data — share the protocol structure.

"I mentioned this to Marcus. He said it's a 'multi-shop protocol library' feature. Is that on the roadmap?"

**Nadia (logged as FR-32-02 for v1.5 scoping):** Cross-shop protocol sharing / multi-shop borescope and inspection protocol library.

**Dale:** "3. The mobile app is fine for work orders. But when I'm on the ramp doing a pre-departure check and I want to quickly pull up the ALS board for N416AB — just the top 5 items, DUE_SOON and COMPLIANT sorted by remaining — the mobile flow is three taps, two load times, and a scroll. That's too many steps for a ramp environment. I want a 'quick view' — a pinned summary card for each aircraft that I can get to in one tap. It doesn't have to do everything. It just has to tell me where I am on the hot items."

**Nadia (logged as FR-32-03 for v1.5 scoping):** Mobile ramp-view — quick ALS status card for pinned aircraft.

---

### §2.6 Check-In — General Platform Adoption at a Turbine-Only Shop

**Nadia:** "RMTS is the only turbine-only shop on the platform. You don't use Athelon for piston maintenance. How does that shape your experience?"

**Dale:** "I think I use about 40% of what's in Athelon. The ALS tracking, the work orders, the borescope protocols — that's turbine-specific and it's where the product earns its keep. The AD compliance module — I use it, but AD tracking for turbines is more nuanced than for pistons. There are ADs that apply to the engine type, ADs that apply to the airframe type, and ADs that interact. The current AD module treats them all the same. That's good enough for most shops. For a turbine-only shop like RMTS, it's a little blunt.

"The things I don't use: the customer portal, most of the customer-facing features. My customers are all aviation professionals — flight departments, charter operators. They don't want a portal. They want a phone call and a maintenance release. The portal is built for shops that serve private owners who want to see their aircraft. That's not me.

"What I want more of: turbine-specific analytics. How is N416AB's fuel burn trending? What does the combustion liner wear rate look like compared to other PT6A-114A operators? I know Athelon can't do that yet — you don't have enough turbine shops. But that's where I want the product to go."

**Nadia (logged as FR-32-04 for v1.5 scoping):** Cross-fleet analytics — turbine type comparisons, trend data, wear rate benchmarking.

---

### §2.7 Check-In — Net Assessment

**Nadia:** "If you had to characterize Athelon's impact on RMTS after 90 days, what would you say?"

**Dale:** "I would say it changed how I think about the relationship between the logbook and the compliance board. Before Athelon, those were two separate things I had to keep synchronized manually. Now the system synchronizes them for me, and the compliance board is a view into the logbook rather than a separate document. That conceptual change — that's the hard thing to put on a sales sheet. But it's real.

"The fuel selector valve is the proof case. We caught a 12,000-cycle limit at 160 cycles remaining, procured the part in 12 days, installed it 20 days before the limit, and closed the work order without a single compliance gap. End to end. First time in eleven years I've been able to point to a turbine compliance event and say: the record shows every step, and every step is right."

**Nadia:** "Last question — would you recommend Athelon to a colleague running a similar operation?"

**Dale:** *[pause]* "I already have. There's a guy I know in Grand Junction — runs a piston-and-turbine shop out of Walker Field. His name is Paul Kaminski. I told him to call Nadia. Whether he calls or not — that's on him."

**Nadia (logged as inbound prospect):** Paul Kaminski, Walker Field (KGJT), Grand Junction CO, piston-and-turbine — referred by Dale Renfrow. Filed in WS32-D shop pipeline.

---

## §3. Check-In Summary — Feature Requests / Open Items

| Item ID | Description | Type | Target |
|---|---|---|---|
| FR-32-01 | Seasonality-aware utilization modeling for ALS dashboard time-to-limit estimates | Feature request | v1.5 scoping candidate |
| FR-32-02 | Cross-shop protocol sharing — engine-type-level inspection protocols accessible across shops | Feature request | v1.5 scoping candidate |
| FR-32-03 | Mobile ramp-view — quick ALS status card for pinned aircraft (one-tap access) | Feature request | v1.5 scoping candidate |
| FR-32-04 | Cross-fleet analytics — turbine type trend data and wear rate benchmarking | Feature request | v1.5 scoping candidate (longer horizon) |
| Prospect | Paul Kaminski, Walker Field (KGJT), Grand Junction CO — referred by Dale Renfrow | Inbound prospect | WS32-D pipeline |

---

## §4. Check-In Conclusion

The RMTS 30-day check-in confirms that Athelon has achieved meaningful adoption in a turbine-only shop environment. Dale Renfrow's feedback is candid: the platform does not yet serve all of RMTS's needs (turbine-specific analytics, seasonal modeling), but the compliance core — ALS tracking, procurement awareness, borescope protocols — has delivered measurable value. The fuel selector valve sequence is his proof case.

Four feature requests logged. All are legitimate product gaps, not noise. FR-32-01 and FR-32-03 are likely v1.5 candidates; FR-32-02 and FR-32-04 are medium-horizon additions that need further scoping.

**OI-32-03 is CLOSED.**

---

*WS32-C complete. 30-day RMTS check-in conducted 2026-06-20. Dale Renfrow's feedback documented. Four feature requests logged for v1.5 scoping. Inbound prospect (Paul Kaminski, Walker Field) filed. OI-32-03 CLOSED.*
