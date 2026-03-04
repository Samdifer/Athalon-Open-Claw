# Carla Ostrowski — Director of Maintenance
**Role:** Director of Maintenance (DOM)  
**Embedded with:** Athelon Engineering Team, Phase 5 Repair Station Integration  
**Date profiled:** 2026-02-22

---

## At a Glance

| | |
|---|---|
| **Certificates** | A&P — Airframe & Powerplant; Inspection Authorization (IA) |
| **Primary authority** | DOM, Part 145 Repair Station; OpSpecs custodian; maintenance release signatory |
| **Experience** | 30 years post-A&P; 33 years total in aviation |
| **Aircraft specialty** | Hawker 700/800/900 series, Beechcraft King Air (all models), Citation Bravo/XLS, Pilatus PC-12 |
| **Current employer** | Central States Aviation Services, Columbus, OH (Part 145, limited/airframe rating, turbine-rated) |
| **Certificate number** | 1178643 (A&P); IA-0082914 |
| **IA renewal status** | Current — renews every 24 months; has never missed a renewal date in 19 years |
| **FAA contacts** | Knows the FSDO in Columbus by name. They know her. This is not a boast. |

---

## Background

Carla Ostrowski grew up in Wichita, Kansas, which she will point out is not coincidental. Her father worked sheet metal at Cessna from 1971 to 1997. She spent enough time in the plant as a kid to know the smell of aircraft aluminum before she knew how to drive. She got her A&P at 23 through Kansas State's aviation technology program and her first job was line maintenance at Air Midwest in Kansas City, where she did Beechcraft 1900 and Metro III scheduled inspections on a night shift for four years and learned that regional carrier maintenance operates on a margin that makes every decision feel like a liability waiting to happen.

She moved to Duncan Aviation in Lincoln in 1999. That's where she grew up professionally. Duncan is the kind of shop that earns its reputation slowly — she worked Hawker 700 and 800 heavy maintenance for six years, then moved into QC, then took the IA at the end of her second year there. She spent eleven years at Duncan total. Long enough to know every Hawker variant's weaknesses by memory, long enough to train three people who now run maintenance departments of their own, and long enough to understand that the DOM's job is not maintenance — it is the *defense* of maintenance. Every sign-off is a legal document. Every audit trail is a deposition waiting to happen.

She left Duncan in 2010 to take a DOM role at Skyline Aircraft Services in Cincinnati, which was a smaller shop with ambition she respected at the time. Skyline was also where she had her worst professional experience with an MRO system, which she will talk about if you ask her, though she will not volunteer it. She left Skyline in 2016 after the shop changed ownership and the new owners began treating OpSpecs as a cost center rather than a compliance document. That is her way of saying she was not willing to sign things she didn't believe in.

She has been DOM at Central States since 2017. Central States is a 28-person Part 145 shop — not large, not boutique. They do scheduled and unscheduled maintenance on business turboprops and light jets, some avionics work, and about three heavy inspections per year on Hawker 800XPs that come to them specifically because of her. She knows the Hawker 800 the way some people know a language — not by translating, but by thinking in it.

She agreed to the Athelon embed because the shop's current MRO system (CAMP with local work order overlays in a modified SharePoint environment that everyone hates) is not sustainable at their current workload. She is not here to validate Athelon. She is here to find out whether Athelon would hold up in an FAA audit. Those are not the same thing.

---

## What "FAA Defensible" Actually Means

This is the question Carla will ask, in some form, within the first hour of any conversation about Athelon's record-keeping. She has heard the vendor answer — she knows what "FAA compliant" means when a sales engineer says it. She is asking about something different.

She has been through four FAA inspections at two different shops. She has had one that got contentious — a 2013 audit at Skyline that resulted in a Letter of Investigation over a maintenance release that was signed in the system before the paperwork trail fully closed. The work was done correctly. The aircraft was airworthy. The record was incomplete by about 40 minutes of data entry lag, and that 40 minutes cost her six months of follow-up, a formal response to the FSDO, and a corrective action plan that she wrote herself over a weekend in January.

When she says "FAA defensible," she means: *if a principal maintenance inspector walks into my shop tomorrow with a subpoena and pulls every record associated with a specific tail number and a specific work order, can I hand them a document trail that is complete, internally consistent, timestamped by action rather than by session, and attributable to a specific certificate number at every signature point?*

She means: not attributable to a login. Attributable to a *certificate*. A username is not a certificate number. An employee ID is not a certificate number. The FAA does not care who "jsmith" is. They care who holds certificate 1178643 and what that person signed and when.

She means: if the system went down mid-work-order and came back up, can she tell the inspector exactly which steps were recorded before the outage and which steps were recorded after, and can she show that the sequence was not altered during the gap?

She means: the system's definition of "signed" must match the inspector's definition of "signed." Not completed. Not approved. Not submitted. *Signed* — as in: an authorized individual, identified by their certificate number, attested at a specific timestamp that a specific task was performed to a specific reference, and that record cannot be edited, voided, or reordered without a separate audit trail entry showing who changed what and why.

She has watched two software vendors present their "audit trail" features. Both times, what they showed her was a change log for the database. She does not want a database change log. She wants a maintenance record. These are legally different things and most software engineers do not know that.

---

## The Skyline System

In 2011, Skyline implemented a product called MaintenancePoint Pro, which was at the time being sold as a purpose-built Part 145 MRO platform. The implementation took eight months. The vendor was responsive in the sales phase. They were less responsive after go-live.

The core problem was the maintenance release workflow. MaintenancePoint Pro was built on a document approval model — it treated a maintenance release like a contract signature. The release was a form. The form had fields. The IA signed the form. The form was stored.

What it did not do was link the maintenance release to the individual work order steps in a way that was immutable. The release could be signed before all steps were closed. The system did not prevent this. It flagged it with a yellow warning icon that, in the default interface configuration, appeared at the bottom of a scrollable page that nobody ever scrolled to. Carla did not build that workflow. She inherited it. She did not discover the configuration gap until the FAA audit two years later.

After the investigation closed, she had the workflow corrected. Skyline's owner at the time wanted to know why it wasn't fixed before go-live. She had an answer for that too, but it is not the answer he wanted.

What she took from Skyline is this: a system that *allows* you to create a compliant record is not the same as a system that *requires* it. She will not implement a system that relies on users configuring it correctly in order to be legally defensible. The defensible path has to be the default path. The non-compliant path should not be possible, or should require a deliberate override that is itself logged.

She has said this to three different software vendors. All three told her their system could be configured to work that way. She now asks to be shown the default configuration before the demo, not after.

---

## Digital Signatures: Her Actual Standard

Carla holds no hostility toward electronic signatures. She signed off on Central States transitioning away from wet signatures on routine work orders in 2019. She is not a paper fundamentalist.

Her standard for a digital signature on an aviation maintenance record is derived from AC 120-78B and 14 CFR Part 43 combined, and she has read both more recently than any vendor she has talked to. Her applied standard:

1. **The signature must be uniquely linked to the signer's certificate number**, not their employee record, not their user account, not their email address. The A&P or IA certificate number must appear in the signature record.

2. **The signature must be timestamped to the action**, not to the session. If she signs a step at 14:23 and the system records it as part of a session that started at 08:00, that timestamp is wrong in a way that matters. Inspectors look at timestamps against logbook entries and flight records. A session timestamp is not a maintenance timestamp.

3. **The signature must be irreversible without a trail.** If a signed step can be unsigned, edited, or voided, there must be a separate, permanent entry in the audit record showing who reversed it, at what time, and with what justification. The original signed entry must remain visible — struck through, flagged, whatever — not deleted.

4. **The signature must be legible at the record level without the software.** She has seen systems where the signature field in the exported PDF shows "electronically signed" with no certificate number, no timestamp, and a reference code that only resolves if you have access to the live database. If her shop closes, if Athelon shuts down, if the servers are gone — the exported maintenance record must stand on its own.

She will ask to see what a printed or exported work order looks like before she evaluates any other feature.

---

## Aircraft She Knows and How She Knows Them

**Hawker 800 / 800XP / 900XP:** Knows the airplane the way you know a difficult relative — every quirk, every thing it does when it's about to surprise you. Has done more than 40 phase and annual inspections on Hawker 800-series aircraft. Knows the Rolls-Royce Spey variants well enough to supervise powerplant work without needing the powerplant specialist to interpret. Specific institutional knowledge: the 800XP thrust reverser sleeve replacement that the manual makes look like a two-person job and is actually a four-person job if you want to do it without scratching the nacelle. She wrote a shop process note on it in 2008 that Central States still uses.

**King Air (B200/C90/350):** Worked King Airs at her first job and never fully left them. Knows the PT6 well enough to supervise but not certify. Her airframe knowledge on the B200 is deep — has done cabin pressurization fault isolation on a B200 that three other shops had misdiagnosed as a bleed air issue for two years.

**Citation Bravo/XLS:** Came to Citations late, relative to the Hawker. Learned the Bravo airframe when Central States took on a Citation account in 2019. Not her primary expertise but she is competent and knows where the gaps in her own knowledge are, which matters more than coverage.

**Pilatus PC-12:** The airplane she respects most for maintenance access design. "Pilatus thought about the mechanic," she has said more than once. Uses it as a reference point when talking about task card design — if a task card doesn't tell you exactly where to find the access panel, it's not as good as the PC-12 manual.

---

## MRO Systems History

| System | Shop | Years | Assessment |
|---|---|---|---|
| Paper (aircraft log and card binder) | Air Midwest | 1996–2000 | Correct for the era. Slow. Reconstructable. |
| CAMP | Duncan Aviation | 2000–2010 | Industry standard for tracking. Not a maintenance execution system. |
| MaintenancePoint Pro | Skyline | 2011–2016 | See above. |
| CAMP + SharePoint overlay | Central States | 2017–present | "A kludge we built because nothing else fits. It works until it doesn't." |

She has evaluated AVMRO, AeroSoft MX, and one other product (name withheld because the vendor is still in business and she does not want the conversation) in the past four years. She walked away from all three evaluations. The common failure mode: none of them could show her an exported maintenance record that would satisfy an inspector without access to their system.

---

## What She Needs Athelon to Get Right

She will not rank these. They are all tier-one requirements.

**1. Certificate number on every signature.** Not optional. Not configurable. Default behavior. If a user account is not linked to a certificate number before they are allowed to sign anything, the system should not allow them to sign anything. This is not a UX preference. This is Part 43.

**2. Maintenance release must be blocked until all work order steps are closed.** Not warned. Blocked. She knows the override case exists — ferry permit, deferred maintenance — and she is fine with a documented override that requires a supervisor approval and generates its own audit entry. What she will not accept is a yellow warning icon.

**3. Exported records must be self-contained.** The printed or exported work order must include: tail number, work order number, task reference (AMM section and revision), each step with its completion timestamp and the signing certificate number, any findings, any parts installed (P/N, S/N, batch or trace number), and the maintenance release with the IA certificate number and timestamp. All of that. In the export. Without requiring database access to interpret.

**4. Revision control must be tail-number-aware.** She will describe a specific scenario: an aircraft has an STC that affects a maintenance procedure. The STC revision supersedes the base AMM for that procedure on that specific tail number. If Athelon presents the base AMM procedure to a mechanic working on that aircraft without surfacing the STC deviation, that is not a reference tool — it is a liability generator. She will ask specifically how Athelon handles STC-specific procedure overrides at the individual aircraft level.

**5. Offline behavior must be defined and displayed.** If the shop's WiFi drops while a mechanic is signing off a step, she needs to know what the system does. Does it queue? Does it fail? Does it silently lose the entry? Does it tell the user? She had a mechanic at Skyline sign the same step twice because the first signature went into a pending state without telling him, and he went back and signed it again when the confirmation didn't appear. Both signatures showed up in the record when connectivity restored. An FAA inspector looking at that record would have questions. She has questions too.

---

## How She Thinks About OpSpecs

Most people at a Part 145 repair station think about OpSpecs the way they think about their business license — something you need to have, something you don't want to lose, something that lives in a binder. Carla thinks about OpSpecs the way a lawyer thinks about a contract. Every limitation in the OpSpecs is a line she cannot cross, and every capability in the OpSpecs is something she has to be able to demonstrate on demand.

Central States' OpSpecs authorize them to perform limited and airframe ratings on specific aircraft makes and models, with turbine-engine authorization for supervision of powerplant work within defined scope. The specific aircraft models listed in the OpSpecs are not suggestions. If an aircraft comes in that isn't listed, she has to either turn the work away or go back to the FSDO for an amendment. She has done both.

Where this intersects with Athelon: she needs the system to know what the shop is authorized to work on. She will not use a system that allows a work order to be opened on an aircraft type that isn't in the OpSpecs without flagging it. She has never had a mechanic accidentally start work on an unauthorized aircraft type, but she has had a parts order go out on an unauthorized type and had to unwind it. The system should reflect the shop's actual authority.

She also needs Athelon to understand the difference between the DOM's authorization and a mechanic's authorization. Not every A&P on her floor is authorized for every task. She has built a competency and authorization matrix in Excel that she hates but maintains because nothing else does it. If Athelon can replace that matrix with something that's actually connected to the work order workflow, it will earn more of her confidence than any demo ever could.

---

## What a Real Maintenance Release Looks Like

The maintenance release is the last thing that happens before an aircraft goes back into service after maintenance. It is the moment where an authorized individual — in the case of major work, the IA — says: I certify that this aircraft has been returned to an airworthy condition, that the maintenance performed was done in accordance with the applicable maintenance data, and that I am personally attesting to this with my Inspection Authorization.

Carla has signed several hundred maintenance releases. She does not treat any of them casually. The specific things she checks before she signs:

**Every open task is closed.** Not "closed pending final writeup." Closed. She will not sign a release with an open item that has been deferred without a proper deferral entry, referencing either the MEL or a specific ferry authority if applicable. She has sent aircraft back to the hangar to close two items before she signed. She will do it again.

**Every part installed has a traceable record.** Part number, serial number, shelf life if applicable, removal from prior aircraft or incoming from vendor with 8130 or equivalent. She has caught two suspect unapproved parts in her career — one at Skyline, one at Central States. Both came in through informal vendor channels. Neither made it onto an aircraft. She credits the paper trail, not luck.

**The work was done to the right revision of the right document.** Not the current document. The document that was current when the maintenance was authorized. This matters more than most people think, and most MRO systems she's encountered handle revision control as a library feature rather than a work order feature. Linking revision to the work order at the time of authorization, and locking it there, is not a nice-to-have.

**Her certificate number is on the record.** Not her name. Not her employee number. Her IA certificate number. The one the FAA issued. The one that can be verified in the Airmen Inquiry database. The one that is hers personally and would survive the shop going out of business.

If Athelon's maintenance release workflow produces a record that checks all four of these, she will say so. If it doesn't, she will explain specifically which one it fails on. She is not looking for reasons to reject it — she is looking for reasons to trust it.

---

## Her Specific Concerns About Athelon

She is not hostile to Athelon. She is precise about her concerns, and she will be watching for specific things during the embed.

**Athelon is unproven on Part 145.** She understands the product has aviation lineage. She does not know if it has been through a real FAA records inspection while the records were *in* Athelon rather than exported to paper. She will ask for references — specifically, she will ask to speak with another DOM who has used Athelon as the system of record through an FAA audit. If Athelon cannot provide that reference, she will treat the embed as a pilot and will not move to it as the system of record until they can.

**She does not trust implementation over default.** The answer "that can be configured to work that way" is a red flag, not a reassurance. She will ask to see default configurations. She will try to find the ways the system can be misconfigured into a non-compliant state and will document them.

**She is watching the engineers' instincts.** When she raises a compliance concern and an Athelon engineer responds with a UI solution, she will note it. When they respond with a data model solution, she will also note it. These responses tell her whether the team understands the problem. A compliant-looking UI over a non-compliant data model is the exact failure mode of every bad MRO system she has encountered.

**She will run the export test on day one.** She will create a test work order, sign a step, close the work order, generate the maintenance release, and then export the full record to PDF. She will look at it the way an inspector looks at it. If it passes, she will tell the team. If it doesn't, she will also tell the team.

**She is watching for feature velocity as a liability signal.** A software team that ships new features faster than they can document compliance implications is a team that will eventually ship a problem into her audit trail. She will ask about the change management process for regulatory-impacting features. She will want to know who reviews changes to the signature workflow before they go to production.

---

## Personality & Interview Notes

Carla Ostrowski does not perform. She has been around long enough that she no longer has patience for the performance that professional interactions often require, and she will not mirror it back to you. She will answer questions directly and correctly and she will not elaborate unless you ask. She is not warm in a way that registers immediately, but she is not cold either — she is simply running a very specific assessment of whether you understand the problem. If you do, she will relax slightly and the conversation will become something closer to a technical collaboration. If you don't, she will not pretend you do.

She has been told she is intimidating. She finds this puzzling in a way that is itself a little intimidating.

She will not say "this is great" in an evaluation. She will say "this passes" or "this doesn't pass" or "this needs to be clarified." If she says something needs to be clarified, write it down — she means it needs to be clarified before she can evaluate it, not that she expects it to fail.

She has strong opinions about aviation software built by people who have never been inside a Part 145 shop. She will express these opinions if asked. She will not express them unprompted — not because she's being politic, but because she has learned that the expression tends to derail conversations that might otherwise be productive. She wants Athelon to be good. She would benefit from Athelon being good. The embed is a productive use of her time only if she approaches it as a collaborator, and she knows that.

She drinks black coffee and will have had one before the interview starts.

---

## Known Requirements She Will Surface in Interview

- Certificate number (not username, not employee ID) must appear on every signature record in the live system and in all exports
- Maintenance release must be system-blocked — not warned — until all work order steps are closed; any override must generate a logged audit entry
- Exported / printed work order must be fully self-contained and inspector-readable without database access
- Revision control must support tail-number-specific STC overrides at the procedure level
- Offline behavior must be explicit, displayed to the user in real-time, and must not allow silent data loss
- Signature timestamps must reflect the time of the action, not the time of session start or sync
- Voiding or reversing a signed step must create a permanent, visible audit entry — original record must remain readable, not deleted
- She will ask for a DOM or IA reference who has been through an FAA records audit with Athelon as the system of record
- She will request to see default configuration before any demo of configurable features
- She will perform an export test (work order → PDF) on day one of the embed, before evaluating any other workflow
