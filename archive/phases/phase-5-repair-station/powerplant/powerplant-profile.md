# Nathaniel Cordova — Powerplant Specialist (Turbine Engine Focus)
**Role:** Powerplant Specialist — Turbine Engine and LLP Compliance  
**Embedded with:** Athelon Engineering Team, Phase 5 Repair Station Integration  
**Date profiled:** 2026-02-22

---

## At a Glance

| | |
|---|---|
| **Certificate** | A&P — Airframe & Powerplant (both ratings) |
| **Primary focus** | Powerplant — turbine engine maintenance, LLP cycle tracking, hot section and borescope inspection |
| **Experience** | 24 years post-certificate; 9 years airline heavy MRO (737/CFM56), 15 years Part 145 bizjet/turboprop |
| **Engine specialty** | Pratt & Whitney PW530A/PW535E (Citation Bravo/CJ1/CJ2/CJ3); CFM International CFM56-3/-7B (737 Classic/NG); Pratt & Whitney Canada PT6A-60A (King Air B350/C90GT); JT15D-5D (CitationJet family); PT6A-114/114A (Cessna Caravan) |
| **Current employer** | Skymark Turbine Services, Phoenix, AZ (Part 145, turbine-rated, engine shop and line maintenance) |
| **Certificate number** | 4402917 |
| **IA held?** | Yes — obtained 2018, specifically for turbine engine return-to-service sign-offs |
| **Engine run authorization** | Yes — authorized at Skymark for PT6A and PW500-series ground runs |
| **Borescope certification** | Yes — Olympus IPLEX NX videoscope, trained through PW Canada authorized service training, 2021 |

---

## Background

Nate Cordova grew up in Tucson, twenty minutes from Davis-Monthan, and spent his teenage years watching the boneyard from the fence. He didn't romanticize the airplanes. He wanted to know why they were there instead of flying, and what it would take to get them back into the air. He got his A&P at 22 from Arizona College of Aviation, and his first real job was at a Southwest Airlines heavy maintenance base in Phoenix, where he spent nine years pulling CFM56-7Bs off 737-800s and putting them back. Airline heavy MRO is not glamorous, but it is disciplined. Everything is tracked. Every LLP has a cycle count updated from ACARS data after every flight. QA watches the numbers. Deferring a life-limited component past its limit is not a procedural inconvenience — it is a career-ending event, and everyone on the floor knows it.

When the airline outsourced a portion of its heavy MRO in 2011 and the Phoenix base reduced headcount, Nate took a job at Skymark, which was then a small turbine shop running mostly King Air and CitationJet work. He has been there since, growing with the shop. He moved from line mechanic to lead powerplant specialist in 2016. He got his IA in 2018 because the shop needed someone who could sign turbine engine records and their previous IA retired. He describes his IA as a tool he needed for the job, not an ambition.

The transition from airline heavy MRO to Part 145 bizjet work was a technical adjustment — different engine families, different operating rhythms. The harder adjustment was cultural. At the airline, cycle tracking was automatic. ACARS fed the maintenance system. A mechanic never had to manually update a cycle count because the system already knew. At Skymark, cycle tracking was a spreadsheet maintained by a service advisor named Doug who left the company in 2014, and whose spreadsheet formatting choices remained inscrutable for years afterward. Nate inherited the spreadsheet. He rebuilt it from scratch over six months and has been its custodian ever since. He speaks about this without bitterness, but with the particular tiredness of a person who has solved the same problem too many times.

He agreed to the Athelon embed because Marcus Webb — who knows Skymark's DOM from an FAA enforcement education seminar three years ago — called and asked. Nate's first question was whether Athelon tracks cycles separately from hours. Marcus said it was a known gap. Nate said he'd come anyway, but he wants to talk about the gap.

---

## What He Needs at the Engine

Nate's pre-work model for any turbine job has three phases, and he treats them as non-negotiable regardless of how busy the shop is or how simple the work appears.

**Phase 1 — Records review.** Before he touches the engine, he pulls the records. Not to look for problems — to establish a baseline. He wants to know: when was the last hot section, and what was found. When was the last borescope, and which sections were inspected. What is the TSO, TSHO, and TSHS as of the last maintenance entry. What are the current cycle and hour counts for every LLP on that engine. He builds his own LLP status list from documentation — not from the system, because the system and the documentation do not always agree, and in turbine work you reconcile before you start, not after.

He needs the software to give him this information cleanly and quickly. Not in a work order view. Not in a parts installation history sorted by date. In an engine record view, organized by component, showing accumulated hours, accumulated cycles, limit, and remaining — all on one screen. He will look at that screen the way a surgeon looks at imaging before cutting. It sets the terms for everything that follows.

**Phase 2 — The borescope.** On any job that involves opening the hot section or compressor, Nate runs a borescope before and after. Before, to confirm what the customer squawk says is actually what he'll find, and to look for anything else. After, to confirm the repair was complete. He documents both. The Olympus videoscope produces a dated image file with his annotations. He links that file to the maintenance record. He wants the system to allow this link at the maintenance record level — not just the work order level — because a work order can contain many records and the image belongs to the specific inspection entry, not the entire work order.

**Phase 3 — The run.** For turbine engine work that involves the hot section or compressor, Nate performs a post-maintenance ground run per the applicable engine manufacturer's procedures. He is authorized at Skymark for PT6A and PW500-series runs. The run produces observable data — EGT, ITT, N1, N2, oil pressure, fuel flow — that he records manually on a run sheet and attaches to the maintenance record. He wants the system to have structured fields for run data, not just a notes field. A run sheet is a structured document. Treating it as a text note loses the ability to compare run data across inspections, which is exactly the comparison that catches early-stage hot section degradation.

---

## Current Tools and Their Failures

His LLP tracking runs on a spreadsheet he built in 2015 after inheriting and rebuilding Doug's. It has one tab per engine family, one row per serialized component, and columns for: part number, serial number, cycle limit, hours limit, cycles accumulated, hours accumulated, TSO, TSHS, date of last hot section, date of last borescope, and next-due interval. He updates it manually after every relevant work order closes. He has been doing this for nine years.

The spreadsheet is accurate because Nate is meticulous and because he treats its maintenance as part of his job description even though it technically isn't. It would not survive his departure. It would also not survive a shop that got busy enough that a junior mechanic was closing work orders and updating the spreadsheet under time pressure. He has thought about this.

He is not attached to the spreadsheet. He built it because there was nothing better. He will discard it the moment there is something better. His requirement is simple: the replacement must be more accurate than the spreadsheet, not less. "More accurate" means it enforces entry, validates against prior entries, and blocks states that are logically impossible. His spreadsheet cannot block someone from entering cycles lower than the prior value. A database can. A database that doesn't is worse than his spreadsheet, because it has the appearance of rigor without the substance.

---

## The Record He Refused to Sign

In 2021, a Cessna Citation CJ2 arrived at Skymark for a scheduled 800-hour inspection on its PW535E engines. The previous maintenance had been performed at a shop in Scottsdale that had recently migrated from one MRO system to another. The migration had been partial — not all records had transferred cleanly, and cycles data had been mapped incorrectly. Specifically, cycles at installation for three life-limited components in the hot section had been entered as total airframe cycles rather than cycles at the time of their individual installations. The result was that the system showed each component with several hundred fewer cycles consumed than they actually had.

Nate caught it during pre-inspection records review. Not because he ran a computation — because the numbers didn't feel right. The turbine disk in question showed 4,200 cycles consumed against a 20,000-cycle life. The aircraft was a 2009 model with documented use patterns consistent with owner-operated charter. At roughly 1.3 cycles per flight hour, and a total airframe hours consistent with the logbooks, the math didn't hold. He called the previous shop. They pulled their paper records, which predated the migration. The discrepancy resolved to 1,100 cycles unaccounted for in the electronic record.

The aircraft was grounded for eleven days while the cycle history was reconstructed from paper flight logs, prior maintenance records, and two calls to the manufacturer's support line to confirm limit applicability for the specific component batch number. The owner was not happy. Nate was not happy either — but he would not sign an RTS on an engine with an unresolved LLP cycle discrepancy, and he does not apologize for that.

He uses this story the same way some mechanics use war stories — not to impress, but to locate himself. He is the mechanic who stopped. He intends to remain that mechanic. He wants the software to make it harder to be the mechanic who didn't.

---

## Engine Specialties and Shop Depth

**PW530A / PW535E** — Nate's primary focus at Skymark. The PW500-series is the engine in the Citation Bravo and the CJ family, and Skymark sees more of those than anything else. He can quote the hot section inspection intervals from memory (1,500-hour HSI on the PW535E, 2,000 hours on the PW530A), name the LLPs and their cycle limits without looking them up, and will describe the combustor liner cracking pattern you find at 800 hours if the previous operator ran the engine hard. He has PW Canada service bulletin awareness current through the most recent revision cycle and reviews SB status as part of every pre-inspection review.

**CFM56-3 / CFM56-7B** — His airline background. He doesn't work these engines at Skymark but his familiarity with the CFM56 LLP structure is deep and shapes his expectations for what a tracking system should do. CFM56 life-limited parts include fan disk, booster disk, HPC disks, HPT disk, HPT stage 1 and 2 blades, LPT disks — all cycle-limited, all individually serialized, all tracked with a precision that the GA world does not uniformly replicate. He uses the CFM56 as a reference standard in conversations about what rigor looks like.

**PT6A-60A / PT6A-114A** — King Air and Caravan work. He knows these engines well enough to do hot section inspections unassisted and to run the engines per the approved procedures. His borescope technique on the PT6 is methodical and documented. He takes comparison photos at each inspection interval and keeps them in a per-engine folder that has grown, over years, into a visual history of each engine's combustion section degradation. The Olympus videoscope report generates a dated image file; he links the file name to the maintenance record entry for that inspection.

**JT15D-5D** — Citation 500/550/S/II series, and some S/II+. He worked these engines at Skymark early in his tenure and still sees them occasionally. He considers the JT15D a forgiving engine if you don't miss the hot section intervals and a punishing one if you do.

---

## How He Thinks About Life-Limited Parts

For Nate, every turbine engine component is either life-limited or not, and that distinction is the primary organizing fact of every engine his hands touch. It precedes everything else — precedes the work scope, precedes the parts order, precedes the schedule.

His pre-work sequence for any turbine job starts with what he calls the "LLP status review." Before he opens a panel, before he writes a squawk, he pulls the engine records and reconstructs the LLP status from documentation. Every cycle-limited part: current cycles, limit cycles, remaining cycles. Every hour-limited part: current hours, limit, remaining. He builds the list on a legal pad — paper, not digital, because he doesn't trust the software he has — and if any component shows less than 10% remaining life, it goes on a separate flag sheet that goes directly to the customer prior to any work beginning.

He does this because he has learned that the gap between what the software says and what the records show is not always zero. His job is to close the gap before the work begins, not after.

He is not cavalier about this. He knows that most of the time the records are right. But turbine engine LLP tracking is one of the few domains in aviation maintenance where a documentation error is not "we missed a corrosion inspection" — it is potentially "a rotating component operates past its certified life and fails." He treats the review as mandatory because the consequence of not treating it as mandatory is not abstractly bad. It is specifically bad, with a specific mechanism.

He also tracks time-since-overhaul (TSO) and time-since-hot-section (TSHS) per engine serial number, not just per aircraft. An engine that has been transferred between airframes — which happens regularly in the used aircraft market — carries its TSO and TSHS with it. His frustration with the software he currently uses is that it tracks these values per work order, which makes them difficult to query per engine serial number across the shop's full history.

---

## 8130-3 Requirements for Engine Components

Nate's 8130-3 requirements are specific to the turbine context, which is more stringent than the general parts context in one important way: for life-limited turbine components, the 8130-3 is not just an airworthiness document. It is also the only authoritative record of the component's prior accumulated cycles.

Block 12 of the 8130-3 — life remaining — is the number he reads first on any incoming LLP. He checks the arithmetic: if the part has a 20,000-cycle life and Block 12 shows 8,400 cycles remaining, then the part has 11,600 cycles consumed. He cross-references that against the work order history for the engine. If the two numbers don't agree within an acceptable tolerance, the part does not move from receiving to available until the discrepancy is resolved.

He has specific requirements for how a system should handle this:

1. **Block 12 synchronization must be bidirectional.** When a part is received with an 8130-3 showing life remaining, the system should compute cycles consumed and write that to the part record. But when cycles accumulate during installation and the part is removed, the system should be able to generate an 8130-3 with the updated Block 12. He has used two MRO systems that received the incoming tag data but had no path to produce an outgoing tag with updated cycle data. That is not a complete system.

2. **Remaining cycles must be computed at installation time, not just at receiving.** A part that arrives with 8,400 cycles remaining and sits in inventory for three months while the shop is busy has the same cycle status. But a part that arrives and is queued for installation must have its cycles-remaining figure verified against the current aircraft cycle count before the installation is authorized. He has seen shops install a component and realize afterward that the aircraft accumulated cycles in the interim that weren't reflected in the original receiving review.

3. **The 8130-3 PDF is not a substitute for structured data.** He can read a PDF. He cannot query a PDF. He cannot run a report across all PW535E LLPs in inventory sorted by remaining cycles. A PDF is better than nothing, but it is a paper solution to a data problem.

---

## What Current Systems Get Wrong: Parts Traceability Module

He has worked with three MRO systems at Skymark over fifteen years. His criticisms of each converge on the same cluster of failures:

**Failure 1: Cycles and hours treated as equivalent.** Every system he has used tracks hours reliably. Cycles are an afterthought — a field that exists but is not enforced, not required, not computed automatically, and not linked to LLP limits in any meaningful way. For airframe work, this is acceptable. For turbine engine LLPs, hours and cycles are separate measurements with separate limits, and a system that treats them as equivalent — or that makes cycles optional — cannot correctly track turbine LLP status.

**Failure 2: LLP tracking per work order, not per component serial number.** When a shop opens a work order, hours and cycles get logged against that work order. But a turbine disk that has been through four shops across twelve years has a history across many work orders, many systems, and potentially many organizations. The component's accumulated life is not the sum of any one shop's work orders — it is the sum of all of them, going back to manufacture. The systems he has used are good at the current shop's history. They are not good at the component's full history. For LLPs, the component's full history is the only history that matters.

**Failure 3: Cycle counter not enforced at the aircraft level.** A cycle-based LLP limit requires a cycle count. A cycle count requires someone to enter cycles after every landing. In the airline world, this was automatic. In the GA/bizjet world, it is manual, and shops often receive aircraft with cycle counts that are estimated, guessed, or simply never updated. A system that accepts a part installation with a cycle limit but does not require an aircraft cycle count is generating false precision. It knows hours. It knows the cycle limit. It is pretending to compute remaining cycles with a number the system doesn't actually have.

**Failure 4: No cross-shop LLP visibility.** If a component was installed at Shop A in 2018, removed at Shop B in 2020, and arrives at Skymark in 2024, Nate has to reconstruct the cycle history from paper. The systems have no pathway to query or receive component history from other organizations. This is a network problem that no single MRO system can fully solve, but what a good system can do is make it easy to enter the incoming history from documentation and flag gaps explicitly. The systems he has used either accept the incoming data silently (no gap detection) or require re-entry in formats that lose information.

---

## On the Cycle Counter Gap

He has read enough of the Athelon documentation — Marcus shared the Phase 2 parts traceability spec before the interview — to know that the cycle counter data gap is acknowledged as an open item. His reaction is not hostile, but it is flat.

> "The spec says cycle tracking is stored but not computed without an aircraft cycle counter, and that the cycle counter will be flagged as a data gap. That's honest. I appreciate the honesty. What I need to understand is what the system does with that gap. Does it tell the mechanic 'I don't have cycle data, so I cannot verify this LLP's cycle status'? Or does it let the mechanic proceed without the data, which means the LLP check is bypassed?"

He is asking because he knows the answer will be one or the other, and one of those answers is not acceptable for turbine work. A system that silently bypasses cycle verification because cycle data is missing is not tracking LLPs — it is creating the appearance of tracking LLPs. An operator who runs such a system and then has a disk failure will not be able to say the system missed it. They will be able to say the system never checked.

His recommendation is specific:

- If an aircraft has a turbine engine with cycle-limited LLPs and no cycle counter on record, the system should **block the installation of any such LLP** until a cycle count is established or the mechanic explicitly acknowledges the gap with a reason code.
- The reason code pathway should not be frictionless. It should require a supervisor or IA to authorize. It should log the authorization in the audit trail with a clear flag that cycle verification was waived.
- The cycle count should be required at aircraft creation for any aircraft with a turbine engine listed. Not optional. Not a soft prompt. Required.

He is not demanding this as a preference. He is describing what he will explain to a FSDO inspector if Athelon is ever part of an LLP finding. The inspector will ask whether the system checked cycles. If the answer is "the system allowed installation without cycle data," the conversation will not go well for the shop.

---

## Paper vs. Software History

Nate's relationship with software is shaped by the airline world. He has used good software. He knows what it looks like. He is not philosophically opposed to digital record-keeping — in fact, he is more committed to digital records than most mechanics he has worked alongside, because he understands that a searchable, queryable database of component histories is genuinely better than a stack of paper folders. His criticisms are not about the medium. They are about the execution.

He has two specific experiences with software failure that he carries:

The first is the Scottsdale shop migration incident — the 1,100 missing cycles — described above. He does not blame the software for that. He blames the migration process for not validating cycle totals against paper records. But the software's failure was that it accepted the bad data without any plausibility check. A 2009 aircraft with a turbine disk showing 4,200 cycles should have triggered a flag: *at average operating rates for this aircraft type, this component should have approximately X cycles. The entered value differs by more than 20%. Verify before proceeding.* No system he has used does this. Athelon should.

The second experience is positive: the CFM56 tracking system at the airline, which he describes without sentimentality but with obvious respect. When a disk hit 85% of its cycle life, the system flagged it to QA, the maintenance controller, and the crew chief on the next scheduled check. Nobody had to remember. Nobody had to run a query. The system was proactive about approaching limits because the airline had decided that waiting for a mechanic to notice was not an adequate safety control. He would like Athelon to work the same way.

---

## Opinions on Aviation Software

**On cycle tracking generally:**
> "The GA world decided cycles were optional because for piston engines they don't matter the same way. That's fine for piston work. But when shops started using the same software for turbine work without modifying the data model, cycles became a field you could leave blank. You cannot leave cycles blank for a turbine LLP. That's not a preference. That's the difference between knowing a part's remaining life and guessing at it."

**On LLP traceability:**
> "The 8130-3 Block 12 shows life remaining as of the signature date. That means on the day the tag was signed, the part had that many cycles left. Every flight since then has consumed more. If the system receives the tag data but doesn't track the flights after that, the number on the tag is wrong the moment the aircraft takes off. The tag is a snapshot. The database should be live."

**On the Scottsdale incident and data plausibility:**
> "I'm not asking for AI. I'm asking for basic arithmetic. If a 2009 aircraft type with known operating patterns shows 4,200 cycles on a component, the system should ask a question. It doesn't need to block. It needs to ask. 'This value is significantly lower than expected for this aircraft type and age — confirm?' That's one conditional. Someone chose not to build that conditional. A disk almost flew 1,100 cycles past where it should have been reviewed."

**On the difference between filing and tracking:**
> "Storing a PDF of an 8130-3 and calling it tracked is the same as putting the tag in a folder in a filing cabinet and calling it tracked. The information is there. You cannot query it. You cannot sort by remaining cycles. You cannot know, at any moment, which of the twelve LLPs in your inventory are within 500 cycles of their limit. A database does that. A filing cabinet of PDFs does not. Most MRO systems are filing cabinets with a search bar."

---

## Notes for the Athelon Team

- Nate will be the most technically specific tester the team encounters for the parts traceability module. He will attempt to enter cycle data in edge cases: a component arriving with cycles equal to its limit, a component whose incoming documentation shows fewer cycles than a prior work order in Athelon's system implies. He will do this because those are the scenarios that catch real errors.
- He gets along well with IA holders and DOM-level personnel. His relationship with Skymark's DOM, Patricia Hensley, is collaborative and professional. Patricia has allowed him to redesign parts of the shop's LLP tracking workflow twice. She trusts his technical judgment on engine work.
- He is not a UI critic. He doesn't care whether the interface is modern. He cares whether the data model is correct, whether the mutation logic enforces the right guards, and whether the records produced by the system are defensible in an FAA inspection. He will not comment on button placement. He will comment extensively on what happens when you try to install a component with zero remaining cycles.
- He should be given the Phase 2 parts traceability document in full before any structured interview session. He has already read it. He will have additional questions. Those questions are worth answering on record.

---

## Personality & Interview Notes

Deliberate. Speaks in complete sentences with very few qualifications. Has a slight Arizona flatness to his speech and the watchful patience of someone who has spent a lot of time listening to engines. He is not here to make friends or to be accommodating. He agreed to the embed because he thinks good software could actually fix a problem he has been working around for fifteen years, and he has enough respect for the team to show up and say exactly what he needs.

He will not soften a requirement to avoid conflict. If the system does something wrong, he will say it does something wrong. If the team fixes it, he will say it's fixed. He will not say it's fixed if it isn't.

He has a specific habit in interviews: he does not answer questions about what he *wants* from software. He answers questions about what he *needs* from software to do his job correctly under 14 CFR. The distinction is important to him. Wants are preferences. Needs are what a FSDO inspector would require him to demonstrate.

He brought a single document to this interview: a printed copy of the Phase 2 parts traceability spec with three sections highlighted. He highlighted Section 6.3 (life-limited part tracking), Section 6.4 (Block 12 synchronization), and the open question in Section 7, item Q2 (cycle counter requirement timing). He had written in the margin next to Q2: *"This is the question. Answer it before launch."*

---

## Known Requirements He Will Surface in Interview

- Aircraft cycle counter must be required for any aircraft with turbine engines — not optional, not a soft prompt; absence of cycle data must block installation of cycle-limited LLPs with a logged waiver pathway requiring IA or DOM authorization
- LLP status must be queryable per engine serial number across the full component history, not just per work order; components transferred between shops carry their history with them
- 8130-3 Block 12 synchronization must be bidirectional: receive incoming life-remaining data and update the part record, and generate outgoing Block 12 data when a part is returned to service
- Cycle remaining must be computed at time of installation (using current aircraft cycle count), not only at receiving — a part that sat in inventory while an aircraft accumulated cycles needs re-verification
- Remaining cycle and hour alerts must be proactive: when a component crosses 80% and 90% of its life limit, the system must notify the IA and DOM without waiting for a mechanic to query manually
- TSO and TSH must be tracked per engine serial number and must be visible on the engine record independent of work order history
- Plausibility checks on cycle data entry: if entered cycle count is inconsistent with aircraft type, age, and operating patterns, the system should flag it for review rather than accepting silently
- The cycle counter gap is a launch blocker for turbine LLP work — not a Phase 3 item; a turbine MRO system that cannot verify cycle status is not a turbine MRO system
