# Troy Weaver — Lead A&P Mechanic (Airframe Focus)
**Role:** Lead A&P Mechanic — Airframe Specialist  
**Embedded with:** Athelon Engineering Team, Phase 5 Repair Station Integration  
**Date profiled:** 2026-02-22

---

## At a Glance

| | |
|---|---|
| **Certificate** | A&P — Airframe & Powerplant (both ratings) |
| **Primary focus** | Airframe — structures, avionics bay, pressurization, hydraulics, flight controls |
| **Experience** | 18 years post-certificate; 22 total in aviation |
| **Aircraft specialty** | Business jets: Citation XLS/CJ3/Sovereign, Challenger 300/350, Gulfstream G280/G450 |
| **Current employer** | SunState Jet Center, Lakeland, FL (Part 145, turbine-rated) |
| **Certificate number** | 3904812 |
| **IA held?** | No — "never wanted the headache" |
| **Preferred tool for sign-offs** | Used to be paper. Now a shop iPad if the software doesn't get in his way. |

---

## Background

Troy grew up in Lakeland, worked line service at Lakeland Linder Regional the summer before community college, and knew by the time he finished A&P school that paper logbooks and fluorescent-lit hangars were where he belonged. He got his certificate at 24, spent four years on prop aircraft (172s, Bonanzas, Seminoles) at a local FBO, and then a Citation shop poached him when they needed somebody who could read a maintenance manual without help. He's been on bizjets ever since.

He's worked on every generation of Citation, every Challenger variant SunState has ever seen, and two Gulfstreams that came in for heavy inspections. He is not a specialist in the narrow sense — he knows turbines well enough to change a PT6 with supervision — but his primary identity is airframe. He can tell you which Citation variant has the landing gear downlock rod that will bite you on the annual, which Challenger has the known issue with the thrust reverser actuator seal, and exactly how many people have been surprised by the G280's horizontal stabilizer access panel torque sequence. He has strong opinions, and most of them are correct.

He has used four different MRO systems over his career: a home-built Access database at his first shop ("I'm not joking, the DOM built it himself"), EBIS 5 for eight years, a brief and miserable six months with a startup product called AeroTrack that was abandoned by its developers mid-implementation, and the current system at SunState (Corridor). The AeroTrack experience left a mark. He talks about it the way combat veterans talk about certain assignments — with a controlled flatness that tells you the story is worse than the telling.

He is not hostile to Athelon. He agreed to the embed because he wants to see the sign-off and task card workflow before it locks, and he says nobody builds aviation software with mechanics in the room when they should.

---

## What He Needs at the Aircraft

Troy's working model: he needs three things when he's standing in front of a panel he's about to open.

1. **The reference.** Which revision of the AMM applies to this tail number. Not the current revision in the library — the revision that was current when the aircraft was modified. He has had two arguments with inspectors about exactly this. He does not want a third.
2. **The history.** What was done here last time, who did it, what was found. If the last guy noted something unusual in the findings and it's not on this task card, Troy wants to know before he opens the panel, not after.
3. **The status of parts tied to this card.** Is the part he needs actually in the building, or is it "in the building" the way the parts system always says things are in the building until you go looking for them.

He does not want a PDF viewer. He does not want to scroll through 400 pages of AMM to find section 53-10-01. He wants the specific section surfaced to the specific step.

---

## Paper vs. Software History

Troy hates paper for operational reasons, not philosophical ones. Paper gets oily. Paper doesn't tell you the next step automatically. Paper disappears. He had a task card blow out of the hangar in a prop wash event in 2019 and spent forty-five minutes reconstructing from memory what had already been signed. That was the day he decided paper was not neutral — paper was actively hostile.

He is equally capable of hating software. AeroTrack required three navigation steps to sign a single task card step. The sign-off screen would sometimes lose the entry between the confirm button and the actual write, and you wouldn't know until you went back to check. He caught it twice. He doesn't know how many times he didn't catch it. That uncertainty is what keeps him up at night when he thinks about digital signatures on maintenance records.

His requirement for any new system is blunt: **if I sign something, I need to see immediately and permanently that it is signed.** No "pending." No spinner. Signed means signed.

---

## Personality & Interview Notes

Direct. Measured. Has a slight Midwestern flatness despite 18 years in Florida. Does not elaborate unless you ask a follow-up. Will answer interview questions precisely and not expansively — if you want more, ask for it. Has a habit of tilting his head and looking at the ceiling for about three seconds before answering any question about software, which suggests he's filtering something before he says it.

He is not here to be a focus group. He is here because he wants Athelon to be good and he thinks the only way it will be good is if someone with grease under their fingernails tells the engineers what matters.

---

## Known Requirements He Will Surface in Interview

- Step-level task card sign-off must confirm immediately in UI (no ambiguous "pending" state)
- Reference documents must link to specific AMM section, not just document-level
- Task history (previous findings on same card) must be surfaced before sign-off, not buried
- Sign-off summary must show: aircraft N-number, task description, reference, his cert number — in one screen, before he commits
- Parts status tied to the card must be visible without leaving the card view
- If the system goes offline mid-workflow, he needs to know exactly which actions did and did not complete
