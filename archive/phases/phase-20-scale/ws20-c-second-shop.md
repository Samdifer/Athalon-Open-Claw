# WS20-C — Second Shop Selection + Onboarding Plan
**Phase:** 20 — Scale  
**Status:** ONBOARDING AUTHORIZED ✅  
**Owner:** Nadia Solis (business development lead) + Rosa Eaton (operations) + Devraj (technical onboarding)  
**Gate:** WS20-B fixes shipped — CONFIRMED  
**Meeting:** Monday 2026-02-23, Athelon team standup + candidate review

---

## The Candidate: High Desert MRO

**Location:** Prescott, AZ  
**Certificate:** Part 145 Repair Station  
**Scope:** Single-engine piston + light twin (Cessna 310, Piper Seneca, Beechcraft Baron class)  
**Personnel:** 6 certificated — 2 IAs, 3 A&Ps, 1 coordinator  
**Current system:** Paper logbooks + one shared Excel file  
**DOM:** Bill Reardon — 22 years in the field, 14 years running High Desert  

---

## How Bill Found Athelon

Bill Reardon wasn't looking. He'd been on the same system — paper plus Excel — for over a decade, and while he knew it wasn't good, it was known. He knew where the file was. He knew which column tracked what. The problem was, so did two other people, and they'd each been updating their own version.

By early February 2026, the shared Excel file had three versions. The one on the shared drive was last touched six weeks ago. Bill's copy was current for aircraft on his side of the hangar. His lead A&P, Marco, had a version on his laptop that had a tab for the twin work that Bill's copy didn't. Nobody had merged them since October.

Bill knew this was wrong. He didn't have a plan to fix it.

He was at a regional IA renewal seminar in Phoenix in late January — a two-day event, mostly familiar faces, the kind of thing where the coffee is bad and the hallway conversations are better than the sessions. Carla Ostrowski was there. She runs Skyline Aviation in Columbus, same Part 145 single-engine world, roughly the same shop size. Bill had met her at the FAA Safety Team event the year before.

Carla mentioned Athelon. Not in a sales pitch. She was just talking about the annual she'd just done on N8432Q, and how she could see every part status from her phone while she was at the seminar, and how the RTS signature was clean and documented, and how she was going to stop worrying about it.

Bill asked what she meant by "stop worrying about it." Carla explained that there's a state she used to be in where she wasn't sure, at any given moment, whether her paperwork was right. Not wrong — she didn't think it was wrong — but she couldn't verify it without going back to the file. Athelon got rid of that state. She knew. At any moment she could open the app and know.

Bill asked for Nadia's number.

---

## What Bill Said When Nadia Called

Nadia called Bill the following Tuesday. She had read his shop profile — Nadia always does her homework — and she led with a question about the light twin work, because that was the differentiator from Carla's shop and she wanted to understand the complexity before she said anything about the product.

Bill talked for eight minutes about the Excel problem before Nadia asked him anything else.

*"The file has three versions and nobody knows which is current. I know that sounds like a simple problem. It's not. Because the version that's current for the singles isn't current for the twins, and the version that's current for the twins doesn't have the right component life totals because Marco updates those separately. And I know this. I've known this for two years. But I can't fix it by merging the files because nobody trusts the merged version either — we've tried."*

He paused. Then:

*"What Carla described — knowing at any moment — that's what I don't have. I know roughly. I have a pretty good idea. But if an inspector walked in right now and asked me to show him the current status on the Baron's left engine, I'd have to find Marco."*

That's the problem Nadia wrote down in her call notes in six words: **has to find Marco to know**.

---

## What's Different from Skyline

High Desert is similar to Skyline in the ways that matter for onboarding: same general shop size, same Part 145 regulatory environment, same population of IAs and A&Ps doing coordinated maintenance. But there are two structural differences:

**1. Team size and coordination surface**  
Skyline has 3 certificated personnel. High Desert has 6. The coordinator role becomes more critical — more concurrent work orders, more technician assignments, more parts in motion. The aircraft sidebar (FR-001) and parts dashboard (FR-004) — both just shipped — are going to matter for Bill's shop in a way they mattered less for Carla's smaller footprint. This is exactly why the second shop was gated on those fixes.

**2. Light twin adds LLP complexity**  
Carla's single-engine fleet has no LLPs. Bill's Baron and Seneca fleet does. Life-Limited Parts on a light twin engine — specifically the Lycoming TIO-540 class — require cycle tracking that doesn't exist in Bill's current Excel setup. Marco has been tracking cycles manually in a separate tab that doesn't tie back to the work order history.

Rosa Eaton flagged this immediately in the pre-meeting prep.

---

## Rosa Eaton's Note on the Light Twin Difference

*"The LLP dashboard is nice-to-have for a single-engine shop like Skyline. For Bill's shop it's load-bearing. If the cycle counts in his Excel are off — and I'd be surprised if they're not, given the three-version problem — then onboarding him means helping him establish a correct baseline, not just migrating a file. We should plan for a data verification pass on the twin component life totals before we go live. If we flip the system on and the baseline is wrong, Bill's in a worse state than he was with the Excel, because now he trusts numbers that are wrong."*  
— Rosa Eaton, pre-meeting prep note, 2026-02-23

Rosa's recommendation: dedicate Day 1 of onboarding to a structured LLP baseline audit. Bill and Marco review every life-tracked component on both twins. Devraj builds the LLP records from that verified baseline, not from the Excel file. The Excel file is a reference, not a source of truth.

---

## Onboarding Timeline: 2-Week Plan

**Week 1 — Foundation**

| Day | Activity | Owner |
|---|---|---|
| Day 1 (Mon) | Kickoff call with Bill + Marco + Nadia + Rosa. Scope the LLP baseline audit. Identify all aircraft, all current WO status. | Nadia + Rosa |
| Day 1 PM | LLP baseline audit: Bill + Marco review every life-tracked component on the Baron and Seneca. Devraj builds Convex records from verified baseline. | Devraj + Rosa |
| Day 2 | Import remaining aircraft data (two C172s, one C182). Create shop profile, user accounts for all 6 personnel. Role assignments: 2 IAs, 3 A&Ps, 1 coordinator (Sandra Chen — Bill's office coordinator, has used spreadsheet systems before, likely to adapt quickly). | Devraj + Nadia |
| Day 2 PM | Product walkthrough with Bill — 90 minutes. Focus on coordinator view, WO creation, parts tracking. Not the full feature tour — just the daily workflow. | Nadia |
| Day 3 | Full team walkthrough — all 6 certificated personnel. Tech-facing features: task card sign-off, tool attach, mobile access. Coordinator features: parts dashboard, aircraft sidebar. | Rosa + Nadia |
| Day 3 PM | First practice work order: Bill creates a maintenance entry on the C172. Not live, not signed — practice. He should make a mistake and recover from it. | Rosa (observer) |
| Day 4 | Bill and Sandra run the coordinator workflow independently. Nadia on standby. No hand-holding unless stuck. | Sandra Chen (lead) |
| Day 5 | Checkpoint call. What's confusing. What's working. Adjust any account configurations. If LLP baseline has issues from Day 1 audit, address now. | Nadia + Rosa |

**Week 2 — Live**

| Day | Activity | Owner |
|---|---|---|
| Day 6 (Mon) | First live work order created and entered into Athelon. Bill opens it. Sandra tracks it. A real job. | Bill + Sandra |
| Day 7 | Second live WO. First LLP record update — cycle increment on a twin engine component. Rosa on standby to verify LLP logic. | Bill + Rosa |
| Day 8–9 | Bill runs independently. Nadia checks in async. Devraj monitors for any data errors or unexpected states. | Async support |
| Day 10 | Closure call. Any remaining questions. Rosa reviews LLP records for accuracy against Bill's paper backup. First live RTS signed on Athelon. | Nadia + Rosa |

**What's different from Skyline's onboarding:**
- Skyline onboarded in 5 days total; High Desert gets 10 because of the LLP baseline audit complexity.
- Skyline had no existing LLP tracking to migrate. High Desert's twin fleet requires a verification pass before we trust any imported data.
- Carla was the only person who needed to be comfortable before go-live. Bill has 5 other people who need to be functional — team walkthrough on Day 3 is new.
- Sandra's coordinator role is more central than Carla's equivalent — she's the person who manages parts flow across concurrent WOs. The parts dashboard matters to her immediately.

---

## Nadia's Recommendation Memo

**TO:** Athelon Team  
**FROM:** Nadia Solis, Business Development  
**RE:** Second Shop Candidate — High Desert MRO — GO Recommendation  
**DATE:** 2026-02-23

High Desert MRO is the right second shop. Here's why.

Bill Reardon found us through Carla. He didn't find us through a demo or a cold call or a LinkedIn ad. He heard Carla describe her life after Athelon — the specific quality of knowing that she'd lacked before — and he recognized the thing he didn't have. That's the strongest possible signal.

His pain is real. The three-version Excel problem isn't disorganization — it's the inevitable end state of any manual system under real operational load. He knows it's wrong. He can describe it precisely. He's been living with it for two years because he didn't have a clear path out. We're the path out.

The light twin complexity is real, and Rosa's note is the right frame. The LLP dashboard isn't a nice-to-have for Bill's shop — it becomes the reason Athelon is irreplaceable for him. If we nail the baseline audit on Day 1 and get his cycle counts right, we'll have built something that his Excel file could never give him: a defensible, auditable life history for every tracked component. That's not a feature. That's compliance coverage.

My recommendation: **GO for second shop onboarding.** Begin week of 2026-03-02.

One condition: Rosa leads the Day 1 LLP audit personally. This is the highest-risk moment of the onboarding. If we get the baseline wrong, we erode Bill's trust before the product has a chance to earn it. Rosa knows LLP tracking cold. She should be in the room.

— Nadia

---

**Decision recorded: ONBOARDING AUTHORIZED — Second shop onboarding to begin 2026-03-02.**

---

*WS20-C filed by Nadia Solis + Rosa Eaton — 2026-02-23*
