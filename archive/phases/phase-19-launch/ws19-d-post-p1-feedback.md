# WS19-D — Post-P1 Customer Feedback: Skyline Aviation Services

**Status: ✅ FEEDBACK COMPLETE**
**Date:** 2026-03-02 (one week post-P1)
**Interviewer:** Nadia Solis (product lead)
**Observer / note-taker:** Miles Beaumont (Aviation Week, embedded)
**Format:** Individual 30-minute interviews, remote, following structured guide

---

## Interview 1: Dave Kowalczyk — A&P Mechanic, 14 years

**Duration:** 34 minutes
**Tone:** Cautious but direct. Dave doesn't waste words.

**What he liked:**

"I like that the sign-off is on the step. Not on the work order. On the step. I've worked at two other shops that had software, and you'd sign off the work order at the end and they'd generate some kind of summary. But you didn't know if anyone actually did step seven or if they just clicked through everything to get to the signature. This way, each step is a moment. I signed the magneto check at 10:12. That's a real time. I was there."

He liked the discrepancy flow. "When I found the gasket, I opened the card and typed the finding right there. Standing at the engine. Then I ordered the part. The whole thing took maybe three minutes. Before, I would have written it on the clipboard, come back inside, looked for the squawk sheet folder, written it out again. Some days I forget to write it down the second time and Carla has to come find me."

He liked that Carla could see the work order status in real time. "She wasn't standing over my shoulder. She could see where I was from her office. That was actually — I didn't expect that to matter to me, but it did. It felt less like I was working alone."

**What confused him:**

"The aircraft record and the work order are two different things. I kept going back to the work order and not being able to find the aircraft's historical data. Like if I want to see the engine TSMOH, it's not on the work order screen — it's on the aircraft record screen. I had to navigate away. Twice I went to the wrong place."

He also found the discrepancy classification labels slightly unclear: "Airworthy / Monitor — I know what that means, but the first time I saw it I thought maybe it meant I should keep monitoring it during the inspection, not that it's a 'we're aware, continuing in service' classification. The label could be clearer."

**What he'd change:**

"Aircraft data visible in a sidebar on the work order screen. Engine hours, last major overhaul, applicable ADs — just there, without navigating. I'm always pulling the aircraft record mid-inspection. Just show it to me."

"Also — this isn't a software thing — but it took me about four inspections' worth of muscle memory to stop reaching for my clipboard. The first day I kept picking it up and then realizing I didn't need it. By Wednesday I stopped."

**The moment he stopped thinking about the software:**

"Magneto timing. Card four. I'd already done three cards, so I wasn't thinking 'now I tap the tablet.' I just checked the magneto, it was in spec, I tapped 'sign off' and moved to the next card without thinking about it. It was just — that's the step, and that's the sign-off. Same motion."

He pauses. "Carla asked me later if I thought we should keep using it. I said yes. That's the most I'm going to say about that."

---

## Interview 2: Ellen Farris — IA, 22 years

**Duration:** 41 minutes
**Tone:** Measured. Precise. She has thought about this.

**On the re-auth flow:**

*Nadia begins: "I want to ask you specifically about the IA re-authentication. You paused when you first saw it on the demo. You paused again on the first live work order. Can you tell me about that?"*

**Ellen:** "The pause on the demo was surprise. The pause on the live work order was different.

"When I got to the certification statement on the live work order — N4471K, Dave's work, the real inspection — I read it and I was aware that I was about to sign something that was going to be in the maintenance record for that aircraft. Not a demo. The plane goes back in service. Students fly it.

"I've signed annual releases for twenty-two years. I do it in four seconds. I write my name on the form and I know what it means, but the act of signing — the physical act — has no weight. It's a signature on a form. The form goes in a folder.

"When the system showed me that statement and then asked me to actually authenticate — re-enter my credentials — I was aware that those were two separate moments. First: here is what you are certifying. Then: do you certify it?

"The paper process collapses those two moments into one four-second signature. You can sign a release without fully engaging with what you're certifying. The system separates them. There's a gap between reading and signing. That gap is the pause.

"Does it feel right? Yes. It feels slow, and it feels right. Those are the same thing.

"Does it feel like what signing a maintenance release should feel like? I'll tell you what I told Nadia: I think it feels like what signing a maintenance release *is* supposed to feel like. The paper process never felt like that. I think I adapted to paper. I think paper made me fast and maybe a little bit numb.

"I don't intend to be numb about it."

**On the audit trail:**

"I reviewed the audit trail on WO-2026-SAS-0001 after closing. Twenty-nine events. I found the one where Dave signed off on the control surface check at 11:17 and I know I was standing in the shop at 11:17 and I watched him do it. It's there. It's the right timestamp. It's his name.

"That's not impressive as a technical feature. It's expected. But it's the first time the expected thing has actually been there."

**What she'd change:**

"Show me the applicable ADs on the task cards where they're relevant. Not just in the AD compliance section at the bottom — put them on the task card for the inspection step that covers the AD. So when Dave is doing the exhaust system check, the card shows him that AD 2021-08-04 applies to this system and here's the compliance note. Connect them at the task level, not just the work order level."

**Her overall sentiment (not asked directly, offered unprompted):**

"I've been flying and inspecting GA aircraft for longer than some of the people who built this have been alive. I've seen a lot of people promise that software would fix maintenance documentation. Most of them were right about the problem and wrong about the solution. I think this might be right about both."

---

## Interview 3: Tina Boyle — Parts Coordinator, 6 years

**Duration:** 27 minutes
**Tone:** Pragmatic. She has strong opinions about her workflow.

**First impressions on parts receiving:**

"The first thing I noticed is that I could see the work order before I received the part. Usually I get a piece of paper from Dave that says 'I need a gasket for the 28.' I have to figure out which work order that goes to and whether it's already been opened. In Athelon, when I open the parts screen, I can see WO-2026-SAS-0001 is open and needs a part for Card 9. I receive against the work order. It's just — it's in order."

**On the 8130-3 entry:**

"It took me a few minutes to figure out which fields were required versus optional. The form has a lot of fields and not all of them are labeled clearly as required. I entered the trace data and wasn't sure if I needed to enter the distributor name in the 'supplier' field or the 'original manufacturer' field. I guessed wrong and had to go back."

Field label clarity logged as a UX item.

**On `pending_inspection`:**

"I like that state. The part exists in the system, it's received, but it's not approved yet. It's honest about where the part is in the process. I used to just email Carla to say 'part is here' and she'd come look at it and say 'ok' and then I'd put it in the parts bin. The state makes that 'ok' into a record."

"The one thing I want: can I see all my pending parts across all work orders in one screen? Right now I have to go into each work order. If there are three open WOs with pending parts, I want to see them all together. Parts aren't organized by work order in the real world — they're organized by where they are in the shop."

**Logged as:** Feature request — parts coordinator dashboard view, all-WO pending parts list.

---

## Interview 4: Carla Ostrowski — DOM/QCM

**Duration:** 49 minutes
**Tone:** She's been building toward this. She has a lot to say and says it carefully.

**Her overall verdict:**

"We're keeping it. That's the short version. For the long version—

"I have three things I care about as a DOM. First: did the work get done right? Second: can I prove it? Third: if something goes wrong twelve months from now, can I reconstruct exactly what happened and who did what?

"Paper fails the third question every time. You try to reconstruct a twelve-month-old inspection from handwritten logs and you're going to be missing something. A step someone signed and you can't read the signature. A part number that someone abbreviated differently in three different places. A squawk sheet that got separated from the work order folder.

"The Athelon audit trail answers question three definitively. Every event, timestamped, sequential, verifiable. If there's an incident on N4471K eighteen months from now and someone asks me what Ellen was certifying when she signed that 100-hour, I can show them the exact certification statement she read, the timestamp she authenticated, and every step Dave signed before she did. That's it. That's the whole record."

**What she would tell another DOM considering Athelon:**

"Tell them the first work order will feel strange. Not bad — strange. Because you're used to doing the paperwork after the work. Or while you're doing the work, on paper, and then the paperwork has no connection to the work itself. In Athelon, the documentation happens at the moment of the work. It feels weird the first time because you're not used to them being the same thing.

"After the first work order, you'll understand what the system is doing. After the first week, you'll have to think about going back to paper to understand why you ever did it that way."

**The one thing she didn't expect:**

"I expected the discrepancy flow to be good. I expected the audit trail. I expected the close readiness report. I had been in the room when they built those things.

"What I didn't expect was the effect on my mechanics.

"Dave is a skeptic. He's been a skeptic about every piece of software that's come through this shop. He didn't say anything bad about Athelon after the first work order. He didn't say anything good, either — Dave doesn't do that. But he came in Tuesday morning and opened the tablet without being asked. He'd already logged in and had the new work order open by the time I got to the shop.

"Ellen — I've worked with Ellen for nine years. I've never heard her say anything like what she said about the re-auth flow. Ellen doesn't talk about her process. She just does it. She said this system made her think about what she was certifying. That's — I've worked with IAs for a long time. No system has ever done that to Ellen.

"I thought the system would change the paperwork. I didn't think it would change the culture."

---

## Feature Requests Logged

| # | Request | Requested By | Priority (team assessment) |
|---|---------|-------------|---------------------------|
| FR-001 | Aircraft data sidebar on WO screen (engine hours, last overhaul, ADs) | Dave | High |
| FR-002 | Discrepancy classification label clarification (Airworthy/Monitor copy) | Dave | Medium |
| FR-003 | AD cross-reference at task card level (not just WO level) | Ellen | High |
| FR-004 | Parts coordinator all-WO pending parts dashboard | Tina | High |
| FR-005 | 8130-3 field labels: required vs optional clarity | Tina | Medium |
| FR-006 | Bulk sign-off for adjacent visual inspection steps | Marcus V | Medium |
| FR-007 | Mobile app (iOS/Android, native) | Dave | High (P5–P6 roadmap) |
| FR-008 | Monitor-classification discrepancy in close readiness report (with notation) | Ellen / WS19-B | Priority (already escalated) |

---

## NPS Score

Nadia conducted a single NPS question at the end of each interview: *"On a scale of 0–10, how likely are you to recommend Athelon to another Part 145 shop if they asked your opinion?"*

| Name | Score | Category |
|------|-------|----------|
| Dave | 8 | Promoter |
| Ellen | 9 | Promoter |
| Tina | 7 | Passive |
| Marcus V | 9 | Promoter |
| Carla | 10 | Promoter |

**NPS: (4 promoters / 5 respondents) × 100 − (0 detractors / 5 respondents) × 100 = 80**

*Note: NPS of 80 from a 5-person single-shop sample is anecdotally positive but statistically limited. Nadia has flagged this appropriately.*

---

## Nadia's Product Notes

*Personal notes from Nadia Solis to the Athelon team, filed post-interview session.*

**Three things I'm taking back:**

1. **Aircraft data on the WO screen is a real gap.** Every mechanic's mental model during an inspection is "this aircraft" — but our UI organizes everything around "this work order." Those are the same thing to us but not to them. The sidebar FR-001 is actually a design problem. We structured the information around our data model, not around the mechanic's mental model during the work. Fix this before the second shop.

2. **The re-auth flow is working.** I was most uncertain about this feature — would it feel punitive? Would IAs hate it? Ellen's response is the one I'll quote to every stakeholder who questions it. "It feels like what signing a maintenance release is supposed to feel like." We got that right, and I think we got it right because Marcus was relentless about the regulatory intent, not just the regulatory requirement. Those are different things.

3. **Carla's last observation is the product strategy.** "I thought the system would change the paperwork. I didn't think it would change the culture." If we can produce that effect consistently — if we can make the documentation happen *at the moment of the work* in a way that changes how mechanics and IAs relate to the paperwork — then we're not selling software. We're selling a culture shift. That's a much harder pitch, but it's the right one. And it only works if the system earns it with every work order. No shortcuts.

**One thing that concerns me:**

The monitor-discrepancy readiness report issue (FR-008 from WS19-B) needs to be deployed before we onboard shop two. Ellen caught it during the demo. She was right. A monitor-classification discrepancy that reads "complete" on the close readiness report is misleading — it's still an open airworthiness condition, just one we've accepted for continued operation. That has to be visible. I don't want to find out shop two has a different Ellen who doesn't catch it.

---

**STATUS: ✅ FEEDBACK COMPLETE**

---
*WS19-D closed. Nadia Solis + Miles Beaumont. 2026-03-02T17:30:00Z*
