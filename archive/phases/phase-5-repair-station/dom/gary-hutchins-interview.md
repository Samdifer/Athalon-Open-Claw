# Interview Transcript — Gary "Hatch" Hutchins
**Role:** Director of Maintenance, Skyline Turbine Services, KMQY
**Interview conducted by:** Nadia Solis, Product Manager, Athelon
**Observing:** Capt. Rosa Eaton (Ret.), Aviation Technical Advisor, Athelon
**Date:** 2026-02-22
**Location:** Skyline Turbine Services — DOM office, adjacent to the main hangar bay
**Duration:** 52 minutes
**Format:** Semi-structured. Notes taken by Nadia. Rosa observing, no active questions.

---

*[Context: The interview takes place in Gary's office, a glass-walled room at the back of the hangar with a clear view of the floor. Three airplanes are in the shop — a Piper Seneca on jacks, a Cessna 414 with cowlings off, and a King Air B200 on a landing gear inspection. A laminated checklist is taped to the wall. The desk has a large monitor showing Corridor's work order dashboard, a printed work order report marked with red pen, and a coffee mug that reads "FSDO SURVIVOR." Rosa and Nadia sit across from Gary. Rosa is quiet throughout, occasionally taking notes.]*

---

**NADIA:** Thanks for taking the time, Gary. I know you're running a full house out there.

**GARY:** Three aircraft, two of my best guys are at a Garmin training this week. It's fine. Rosa said you were worth talking to, so here we are.

**NADIA:** Fair enough. Can you start by describing your typical day — just the morning routine and how software fits into it?

**GARY:** I get here before anyone else. I do a walk. Every airplane, every work area. I want to know what the hangar looks like before I open anything on the computer. Then I open Corridor and filter it to Active — I have to filter every single morning because it defaults to showing me everything, including work orders from eighteen months ago that are closed. That's my first complaint with every piece of MRO software I've ever used: I don't want to see history first thing in the morning. I want to see what's alive right now.

After that, I walk the floor and talk to the techs. I'm not a paperwork person sitting in a glass box — I need to know what's physically happening before the paperwork tells me what's supposed to be happening. Then I come back in here and reconcile the two.

**NADIA:** And how does Corridor fit into that reconciliation?

**GARY:** It's the official record. Everything that happens out there needs to end up in Corridor. Step sign-offs, discrepancy write-ups, AD compliance notes, parts pulled — all of it. The problem is that about half my guys still hand-write things during the day and enter them in Corridor at the end of the shift. Which means from seven AM to four PM, what's in Corridor and what's actually happening in the hangar are two different things. I've been trying to fix that for years. The mobile situation with Corridor doesn't work well enough to make it realistic for someone running an air ratchet to stop and enter a step on a phone.

**NADIA:** So the disconnected state between the hangar floor and the system is a real day-to-day problem.

**GARY:** It's the problem. Everything else flows from it. If the record is right, I can manage. If I find out at four-thirty that a tech forgot to enter three step sign-offs from this morning and he's already left for the day, I've got a paperwork problem that I have to sort out, and those aren't fun. We have to do a correction entry with an explanation. And Corridor's correction flow is — *(pauses)* — let's just say it was not designed to be used frequently. It's buried.

**NADIA:** Can you walk me through an AD compliance action in your current workflow? From the aircraft arriving to the AD record being closed?

**GARY:** Sure. Aircraft comes in — let's say it's a Seneca, hundred-hour. Owner calls for an appointment, my parts clerk schedules it. Before the work order gets opened, I pull the aircraft's AD compliance record from Corridor and I cross-reference it with the FAA AD database for any recent issuances. I do that manually on Mondays — I go to the FAA website and check what's been issued for every aircraft type we have in the shop. Corridor is supposed to pull AD data but I don't trust it completely.

**NADIA:** Why not?

**GARY:** Because I had a finding in 2019 related to an AD record that was in the wrong work order. *(He pauses and his expression goes flat for a moment.)* I used a template copy function to speed up a repeat customer's paperwork. I didn't realize that in Corridor, when you copy a work order template, the AD compliance entries that are linked to the template copy their linkage with them — but they're still pointing at the template. When I closed the real work order, the AD note was sitting on the template, not on the actual work order. The AD was complied with. The aircraft was fine. But the digital traceability chain was broken, and the FSDO inspector found it on surveillance.

**NADIA:** What happened?

**GARY:** Letter of Correction. No penalty, but it's in my record. *(He pulls open a desk drawer, holds up a sheet of paper, puts it back.)* I keep it there to remember that the software's job is not to help me go faster. Its job is to make sure what actually happened gets recorded in a way that survives scrutiny. If it helps me go faster as a side effect, great. But that's not the primary job.

**NADIA:** That's a strong framing. What would the AD compliance flow look like if the software was doing its job?

**GARY:** First: I wish the software would refuse to let me close a work order if there's an AD that's been opened against that work order and not resolved. Not a warning I can click through. An actual block with a clear message: "AD 2017-04-06 is recorded as applicable and has no compliance record. Resolve or document inapplicability before closing." Right now, Corridor will warn you but it doesn't block. And warnings get clicked through. I've done it myself.

Rosa says she wants that as a hard gate in Athelon. I agree with her.

**NADIA:** *(glancing at Rosa, who nods)* That's already on our list. What else?

**GARY:** Second: I wish the software would make it impossible for an AD compliance record to be moved or separated from its work order after it's been associated. I don't want a drag-and-drop, I don't want a copy function that silently re-links things. If an AD compliance action happened in work order number X, it should be bound to work order X for the life of the record. The only correction mechanism should be an explicit, audited amendment that requires a reason.

That change alone would have prevented my 2019 finding.

**NADIA:** Understood. Can I ask about task card workflow? How do your techs work through a 100-hour today?

**GARY:** Task cards live in Corridor as a checklist attached to the work order. Each card has steps. The tech works through the steps — physically does the work, marks each step complete in Corridor, and adds any notes. If they find a discrepancy — cracked part, failed inspection point — they write it up as a discrepancy on the work order. Everything gets signed with their certificate number when they close the card.

The problem is that the sign-off in Corridor is an entry in a text field. I type my certificate number, I type the date, I type a statement. There's no actual cryptographic verification that it was me. Anyone who knows my cert number could type it. Now, are my guys going to forge my signature? Of course not. But if I'm sitting across from an FAA inspector and he asks me how I know it was me who signed that record, the answer is "because I said so," which is not a satisfying answer.

**NADIA:** How do you feel about PIN-based re-authentication for signing?

**GARY:** *(leaning forward slightly)* Like a point-of-sale terminal?

**NADIA:** More like a step-up authentication event. You're logged in as yourself, but before a signing action, you re-enter your credential — PIN or password — and the system cryptographically binds that event to the record in the same database transaction as the sign-off.

**GARY:** That's — yeah. That's actually what it should be. The signature should be an event, not a field. The fact that you entered your credential at that moment should be recorded and linked. Not just "Gary Hutchins, 2/22/26." That's just text. *(He looks at Rosa.)* Is that what Marcus was pushing for?

**ROSA:** *(quietly)* That's what's already built.

**GARY:** Huh. All right.

**NADIA:** Walk me through your pre-release process. What happens in the last hour before an aircraft goes back to an owner?

**GARY:** *(pointing to the laminated checklist on the wall)* That. Every time. I check all task cards — not just that the status in the software says complete, I look at whether every step has a sign-off with a date and cert number. I check the maintenance record — is it created, is it signed, does the aircraft total time in the software match the logbook entry. I check the AD compliance record. I check the discrepancy log — everything either corrected with a maintenance record, or deferred with owner notification documented. Then I walk the aircraft physically. Cowlings on, no tools left inside, nothing hanging.

The software's job in this process is to show me those five things clearly on one screen. Right now in Corridor I have to open four different tabs to see all of it. I wish the software would give me a pre-release readiness view — one screen, one checklist, green or red for each item, with the ability to click into any red item directly from that view. That would save me fifteen minutes per aircraft release and reduce the chance I miss something.

**NADIA:** That's essentially what we've built. We call it the Close Readiness Report.

**GARY:** *(pause)* Does it block closure if anything's red?

**NADIA:** Yes. Hard block on the Return-to-Service authorization if any precondition fails.

**GARY:** Then you've solved the main problem. The rest is details.

**NADIA:** Last question — what would make you not trust this software? What would you watch for?

**GARY:** Three things. One: if the records aren't immutable. If someone can go back and edit a signed maintenance record without creating an audited amendment, I don't care how good the rest of it is — that's a records integrity problem and I won't use it. Two: if the system can go down and take my records with it. If it's cloud-hosted, I want to know there's a backup I can put my hands on. Physical. Not "it's in the cloud." Three: if it's designed so that the UI makes things look done when the regulatory requirement isn't actually complete. If there's a green checkmark before the FAA would say it's done, that checkmark is a liability.

**NADIA:** Those are fair tests. We've thought about all three.

**GARY:** Good. Rosa, you vouching for these people?

**ROSA:** *(dry)* I'm vouching for the data model. The people are still on probation.

**GARY:** *(to Nadia)* That's a yes from Rosa. You're in good shape.

---

*[Interview concluded. Gary returned to the hangar floor. Rosa stayed for an additional twenty minutes to debrief with Nadia.]*

---

## Requirements Extracted — Gary Hutchins Interview

### REQ-GH-01: Hard Block on AD-Open Work Order Close
Work orders with associated ADs that have no compliance record (or no documented inapplicability determination) must be blocked from closure. Warning dialogs are insufficient. Error message must name the specific AD(s) and provide a direct action path to the AD compliance record.

*"Not a warning I can click through. An actual block."*

### REQ-GH-02: Immutable AD-to-Work-Order Binding
Once an AD compliance record is associated with a work order, that association must be permanent and audited. No copy, drag, or template operation may silently re-link or orphan an AD compliance record. Any amendment to the association requires an explicit action with a documented reason, a separate audit log entry, and cannot be performed by the user who created the original entry without supervisor approval.

*"If an AD compliance action happened in work order number X, it should be bound to work order X for the life of the record."*

### REQ-GH-03: Pre-Release Readiness View (Single Screen)
Before aircraft release, the system must present a unified readiness dashboard showing: (1) task card completion status (step-level, not card-level), (2) maintenance record existence and signature status, (3) aircraft total time reconciliation (system vs. logbook entry), (4) AD compliance current status (no overdue recurring items), (5) discrepancy log (all open items either corrected or deferred with owner documentation). Each item must show green/red state with direct navigation to the blocking record. Closure must be blocked until all items are green.

*"One screen, one checklist, green or red for each item."*

### REQ-GH-04: Signing as a Cryptographic Event
Step sign-off must not be implemented as a text field entry. Signing must require a re-authentication event (PIN or credential step-up) that is cryptographically consumed in the same database transaction as the sign-off record. The system must be able to demonstrate, to an FAA inspector, that the person who signed was authenticated at the moment of signing.

*(Confirmed as already implemented — REQ-GH-04 is MET in current Athelon build.)*

### REQ-GH-05: Active-First Default Dashboard
The work order dashboard must default to showing "Active" work orders on first load and on each morning session. No filter selection required. This is a day-one UX requirement, not a nice-to-have.

*(Confirmed as already designed — REQ-GH-05 is MET per Nadia's competitive design notes.)*
