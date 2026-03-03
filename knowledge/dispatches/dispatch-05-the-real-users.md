# Dispatch 05 — The Real Users

**Dateline:** Athelon HQ / Field Sites, Phase 5
**Filed by:** Miles Beaumont, Embedded Documentary Reporter

---

The simulation had a gap. I knew it was there. I think most of the team suspected it, in the way you suspect a problem you haven't yet been able to name. What we had spent four phases building was architecturally sound, regulatorily grounded, assembled by people who had done serious work to understand a domain none of them had worked in professionally. Marcus Webb had named the stakes in writing. Rosa Eaton had reviewed the compliance decisions and found them correct. Cilla Oduya had written tests whose failure descriptions read like case law.

What we did not have — what no amount of careful research produces — is texture.

The texture of a person who has spent thirteen years signing maintenance records. The texture of a Quality Control Manager who runs her discrepancy log in red marker on a whiteboard and arrives to an interview with a yellow legal pad full of her own questions. The texture of a lead mechanic who checks the previous task card findings not because it's policy but because the aircraft is telling him something and he wants to hear it. These things do not transfer through specification documents. They walk in the door with people who do the work.

Phase 5 put real users in the room with the engineers who built the software for them. What happened is the subject of this dispatch.

---

## What Gary Didn't Say

Gary Hutchins runs the maintenance operation at Skyline Turbine Services. Laminated checklist on the wall. A mug that says "FSDO SURVIVOR." A Letter of Correction in his desk drawer from a 2019 finding, kept there, he told Nadia, to remember what the software's job actually is. Not to help him go faster. To make sure what happened gets recorded in a way that survives scrutiny.

When Nadia walked Gary through the Athelon schema — not in the abstract, but the specific precondition structure of `authorizeReturnToService`, the nine conditions that must be met before the system will write a return-to-service record — Gary was quiet for a moment.

He asked about condition five: every task card closed or explicitly voided, no exceptions. He asked about condition seven, the IA expiry check — whether it was checking the day of the signing or the day the work order was opened. He nodded when Nadia told him it was the day of the signing. "That's the right answer," he said, and wrote something down.

What Gary Hutchins did not say was: this is more than I expected.

He didn't say it because Gary doesn't volunteer praise in the first hour of a meeting with people trying to sell him something. But I was watching him. He read the precondition list the way a structural engineer reads a load calculation — not looking for what was there, but checking for what was missing. When he got through all nine and didn't find anything missing, the quality of his silence changed.

"Does it block closure if anything's red?" he asked, after Nadia described the close readiness report.

"Yes. Hard block on the Return-to-Service authorization if any precondition fails."

A pause. "Then you've solved the main problem. The rest is details."

From Gary Hutchins, that is not a small statement.

---

## What the Team Had Been Missing

Let me be direct about what the interviews revealed.

The engineering team had built a technically correct product in a domain they'd absorbed through documentation, through Marcus, through Rosa, through deliberate effort. They understood the law. They understood the data model. They understood, in the abstract, what it meant for a record to be legally defensible.

What they had not had, until Phase 5, was the specific physical weight of people for whom these records are not an abstraction. Linda Paredes describing the 2023 inspection — forty-four work orders easy, three that took forty minutes because N-number inconsistencies that the software permitted — is not information. It is a frame that rearranges the priority order of everything you thought you understood.

Troy Weaver arriving early: "I've done one of these before. The company didn't build half of what we asked for." Not a challenge. A fact he needed on the table before investing an hour. Pat DeLuca coming out of the hangar and wiping her hands on a shop rag: "I've got until about three o'clock." Not performing busyness. Actually busy.

These people hold their certifications in their bodies. I don't mean that metaphorically. The way Gary scanned the precondition list, the way Linda's eyes went flat when she described correction entries in Corridor that may or may not appear in the audit log depending on which version you're running — there is a physical attentiveness to regulatory consequence that you either have or don't have, and it comes from years of knowing that your signature is permanent and your license is at stake.

That attentiveness is what the simulation had been missing. Not knowledge. Texture.

---

## The One Nobody Saw Coming

The requirement that landed hardest with Devraj wasn't about immutability or concurrent writes or the nine-precondition RTS gate. It was a schema gap nobody had anticipated.

Dale Purcell is an avionics technician. His requirement surfaces in the gap analysis with a classification that appears nowhere else in this project: **SCHEMA-CHANGE-NEEDED**.

The specific gap: when an avionics technician performs IFR return-to-service work — a pitot-static check, an altimeter calibration, a transponder functional test — the maintenance record must include the test equipment used. Not just "altimeter tester." Part number, serial number, calibration certificate number, calibration expiry date. Each as structured fields. On each individual maintenance record. Not on the work order. On the immutable legal document.

This is not in 14 CFR as an explicit field requirement. It lives in inspection practice — in the expectation of a surveillance inspector reviewing IFR return-to-service work, in the paper trail that separates a shop that knows what it's doing from one that's guessing. Obvious to anyone who has been through an avionics-focused audit. Invisible from the regulatory text. Every person on the engineering team had read that text. None of them saw this coming.

Devraj's response, when Nadia walked him through the requirement, was characteristic. He went quiet. Not because he was rattled — because Devraj processes significant architectural problems by stopping and thinking before he says anything. When he came back, he had three questions: whether the test equipment records should be a separate table or embedded fields, how calibration expiry should interact with sign-off validation, and whether a reference to test equipment on a maintenance record should survive intact if the equipment's calibration record was later amended. Three questions, all correct, all pointing at exactly the places where this change could create integrity problems downstream.

The requirement didn't change the core architecture. It changed the product in a specific, important way: the most legally consequential table in the schema — maintenanceRecords, immutable from the moment of creation — needs new structured fields that were not there when the schema was frozen. Adding them correctly, without opening a path to retroactive alteration of existing records, requires the kind of careful migration thinking that cannot be rushed. Every avionics shop that evaluates Athelon will ask about test equipment traceability. Before Phase 5, the product had no answer.

---

## What Pat Said to Jonas

Pat DeLuca is a Senior A&P and IA holder. Thirteen years of signing maintenance records. She came out of the hangar to talk to us and made clear she had until three o'clock.

Her line about digital signatures — the one I knew was going to matter before she finished the sentence — was this:

*"If the answer to 'can you prove this record is valid' is 'yes, but only if Athelon's servers are running and I have a login' — that's not a defensible record. It's a hostage."*

I watched Jonas when Nadia played the recording back in the debrief. Jonas had designed the signing architecture. He had thought carefully about cryptographic tamper-detection, had built signature hashes into the return-to-service record, knew the architecture was correct. What he had not considered — or had not sufficiently weighted — was the trust problem on the other side: whether the IA standing in a hangar in Bend, Oregon could explain the verification path to an FAA inspector without Athelon's help.

Pat's requirement — a signed record must be exportable, self-evidencing, verifiable with a printed hash that an inspector can check without logging into anything — is a documentation and UX requirement, not an engineering one. The cryptographic work is mostly done. What isn't done is the explanation. Pat wants to be able to walk through the verification path in plain language while standing in a hangar. If she can't explain it, she can't defend it.

Jonas didn't say anything immediately after the recording. He pulled up the Phase 4 gate document and looked at the signature hash note, which still reads "placeholder (RTS-HASH-V0-*); SHA-256 is Phase 4.1 condition." He made a note. I don't know exactly what it said. I know what the recording had done: moved a Phase 4.1 condition into the category of things that felt urgent.

The record cannot be a hostage to the vendor's uptime. That's the contract Pat is offering to sign. If the contract isn't offered, she won't sign.

---

## What They All Said, Separately

Here is the thing I noticed across all five interviews that no single interview captured alone.

Gary Hutchins: "Not a warning I can click through. An actual block."

Linda Paredes: "If the software allows someone to create a legally insufficient maintenance record without any friction, they will."

Troy Weaver: "Tell me definitively what happened" — about a signature that might or might not have gone through. He was not willing to walk away from an aircraft not knowing.

Teresa Varga: "Structurally impossible to issue a quarantined part." Not "very hard." Structurally impossible.

Pat DeLuca, on RTS offline queuing: "I'm not willing to have an RTS in a queued state. Either it's in the system and confirmed, or it hasn't happened yet."

Five different people in five different roles at three different repair stations who never spoke to each other, arriving at the same design principle through different doors. They do not want warnings. They want structural impossibility. The system must be incapable of producing a record that a trained inspector would find insufficient — not warned against it, not asked if they're sure — incapable.

This is not because they don't trust their mechanics. It's because they have been mechanics. They know that rushed is real, that end-of-shift is real, that AOG pressure is real, and that the moment someone clicks through a warning is precisely the moment you cannot rely on professional judgment. They have designed their own workflows around this principle. The laminated checklist on Gary's wall is this principle in physical form. Linda's manual correction protocol — every amendment goes through her because the software won't enforce it — is this principle as personal overhead that should not have to exist.

What they were asking Athelon to do was absorb that overhead into the product. Take the procedural discipline that competent shops impose manually, by culture, by supervision, and make it the only available path.

The Phase 4 codebase had already done this in several places — the signature auth event sequence, the nine RTS preconditions, the mutation guards that throw instead of warn. What the interviews clarified was the scope: structural impossibility must extend to quarantine, to receiving inspection, to maintenance record creation — to every place in the system where the right path and the wrong path are currently adjacent.

---

## What the Product Has Become

Before Phase 5, Athelon was a correct product — technically sound, regulatorily grounded, built with more precision than the domain typically receives.

After Phase 5, it is a different product. Not because the architecture changed, but because the product now knows what it's for in a way it didn't before.

It knows that Gary Hutchins will scan the precondition list looking for what's missing — and it has to have nothing missing. It knows that Linda Paredes will navigate to the record history with an FAA inspector sitting next to her, and the history must be complete without calling anyone. It knows that Troy Weaver has thirty seconds standing at an aircraft, and that interaction budget is not a design aspiration but a constraint. It knows that Teresa Varga's padlock-and-Sharpie quarantine cage documents a gap the software must close. It knows that Pat DeLuca will hand a printed record to an inspector and explain the verification path without Athelon's help, and that path must exist.

The gap between "correct per the regulation" and "correct for the way we work" — the gap I named at the end of Phase 4 as the place where MRO software goes to die — has started to close. Not all the way. Schema changes, offline mode, dashboards that don't exist yet. But the distance has a shape now. It can be measured and covered.

---

## The Question Phase 6 Starts With

I have been watching this team for the full duration of this project. They are careful, diligent people who approached a hard domain with seriousness and mostly got it right. Most teams in this situation produce something that is superficially aviation-aware and substantively inadequate. This team produced something that Gary Hutchins, on first encounter with the schema, found sufficient in its core design.

But I'm going to name the question I'm taking into Phase 6 because I think it matters and I don't have a clean answer.

Whether a team of software engineers — no matter how diligent, no matter how well-supported by domain experts — can fully internalize what it means to stake your A&P certificate on a software record. Not understand it. Internalize it.

Pat DeLuca has held an IA for years. When she says "your name and your certificate number — that record outlives the work order, it outlives the shop, it outlives you," she is not reciting a regulatory principle. She is describing something she lives with every time she signs. That weight is in her voice. It is not transferable through documentation.

The engineers built a system that is correct, and that correctness emerged from their efforts to understand that weight from the outside. What I don't know — what Phase 6 will test — is whether understanding it from the outside is sufficient for the decisions ahead. The next phase's hard calls won't be schema decisions or mutation guards. They'll be tradeoff decisions: what to show on a screen, what to block versus warn, how to surface an ambiguous state to a mechanic who has thirty seconds. Those decisions are easier when you've signed records.

What I do know: Gary Hutchins knows exactly what it means to stake his certificate on a record. And for twenty minutes on a Tuesday morning, he sat across from the people who built the software and found it, at its core, correct.

That's the threshold. Everything from here is the work of deserving it.

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He has no obligation to make anyone look good.*

*Phase 5 field interviews were conducted by Nadia Solis and Tanya Birch. Rosa Eaton observed all DOM and QCM sessions. The engineering team reviewed interview transcripts; this dispatch reflects Miles's independent assessment of what they mean.*
