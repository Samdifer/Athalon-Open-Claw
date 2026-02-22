# Interview — Dale Purcell, Avionics Technician
**Conducted By:** Nadia Solis (Product Manager)  
**Observing:** Marcus Webb (Compliance Advisor)  
**Location:** Desert Raptor Aviation — Avionics Shop, Henderson, NV  
**Date:** 2026-02-22  
**Duration:** 68 minutes  
**Format:** Semi-structured. Dale was seated at his bench. His Aeroflex 2050T was running a VOR output test in the background for the first twenty minutes.

---

*[Note from Nadia: Dale answered the door to the avionics shop, glanced at my laptop bag, and said "if you're here to tell me a form is intuitive, we're going to have a short meeting." I told him we were here to hear about everything that isn't. He sat down and seemed to genuinely relax.]*

---

**Nadia:** Tell me about a normal Tuesday in this shop. What does your day look like from a documentation standpoint?

**Dale:** Tuesday. Okay. Right now I've got a Baron in the back — we're doing an autopilot upgrade, Garmin GFC 600 under STC SA04119NY — and a 182 with a G3X Touch retrofit in the east bay. Different stages. Plus I've got a comm radio for a customer's Mooney sitting on my bench for a bench test — pulled it because he was getting intermittent squelch issues on ground. So that's three aircraft worth of open work orders, which isn't unusual. On paper — literally on paper, on that whiteboard — I've got each tail number, what I've touched, what's pending, what's waiting for parts.

Now, the documentation day. I'll open EBIS 5. I'll navigate to each work order. It takes about three clicks per aircraft to get to the task card I need. I update whatever I did yesterday, sign off the steps I completed, and then I go back to the whiteboard to figure out what I'm actually doing today. The whiteboard and EBIS 5 are two separate systems. They're not talking to each other. I maintain both. If I die in a forklift accident tomorrow, someone is going to try to read that whiteboard and they're going to fail.

**Nadia:** What does the whiteboard capture that EBIS 5 doesn't?

**Dale:** Cross-aircraft visibility. I want to see all three of my active jobs at once. EBIS 5 shows me one work order at a time. That's fine if you're running one job. I've never run one job. I usually have four or five open, because avionics work isn't linear — you pull a unit, send it to the bench, it's on the bench for two hours, during which time I'm doing something else on a different aircraft. I need to track where I am on each simultaneously. EBIS 5 doesn't do that. My whiteboard does. Software should do this.

*[Marcus, quietly]: When you have multiple aircraft with open work orders simultaneously, are there cases where the task cards overlap — same type of work across different aircraft?*

**Dale:** Yeah. Transponder checks, VOR checks, pitot-static checks — I'll batch those. I'll run three aircraft through a pitot-static check in one afternoon because the setup time for the Barfield is the expensive part. So I've got one test set, three sets of adapters, three aircraft, and I'm documenting three separate maintenance records with the same test equipment. That's where the software falls down.

**Nadia:** Walk me through the documentation for that — the test equipment reference. What should be in the maintenance record?

**Dale:** Okay. Under Part 43, Appendix E, pitot-static system checks have to be performed with equipment appropriate to the test. The equipment has to be calibrated. I have a Barfield 1811FA and it has a current calibration certificate — it was calibrated at Barfield's facility in Miami in November, next due November 2026. That calibration cert has a number on it. The instrument has a serial number. I'm supposed to be able to say: this test was performed with equipment serial number [whatever], calibration certificate [whatever], valid through [whatever date]. That information goes in the maintenance record.

Right now, I write it by hand in the "work performed" text field. I have a standard paragraph I type every time. Manually. Every time. If someone else in the shop did the test, they'd write it differently, or they'd forget it. There's no field in EBIS 5 for test equipment references. There's a comments field and I abuse it.

**Nadia:** What would the field look like if you designed it?

**Dale:** I'd want: equipment type — call it "test equipment" — part number, serial number, calibration cert number, calibration expiration date. Linked to the maintenance record, not to the work order. The work order is the container. The maintenance record is the legal entry. Test equipment belongs on the maintenance record because that's what you're certifying — that the work was performed with calibrated equipment. I might have six maintenance records against one work order, each with different test equipment. The software needs to support that.

**Marcus:** And from a regulatory standpoint, is the calibration expiry date something the system should validate? Block a sign-off if test equipment is out of cal?

**Dale:** That's a good question. I'd say warn, don't block. I know my equipment. If my cal expired yesterday and I'm in the middle of a job, I need to be able to complete the sign-off and note that the calibration was being renewed. A hard block is a liability when the renewal is en route. But I absolutely want the warning. A tech who doesn't notice their equipment is out of cal because the software didn't tell them — that's a real failure mode.

**Nadia:** Tell me about TSO compliance documentation. How does that flow through your current process?

**Dale:** Every unit I install that's TSO'd — transponder, ADS-B, GPS, ELT, comm radio, whatever — has a TSO authorization number. That number is on the DER approval, it's referenced in the STC (if there's an STC involved), and it should be on the 8130-3 if the unit came from a repair station. When I install the unit, I need to verify the TSO authorization is current and applicable to the aircraft and the installation.

Right now, that verification happens in my head and in a handwritten note on the work order. I've got a binder — *[gestures to a thick blue three-ring binder on the shelf above his bench]* — with the TSO texts for the ones I work with most. I verify manually. I note the TSO number in the maintenance record. Nobody standardized how to note it. I write "Installed per TSO-C146d, STC SA04119NY." Someone else might write "TSO compliance verified." These are not the same thing.

**Nadia:** What should the software capture?

**Dale:** The TSO number should be a field on the part record — structured, not a text note. "TSO authorization" as a field, linked to the part's installation record. And then I want a field for the STC number or the FAA 337 number that authorized the installation. Those are different documents. The STC covers the modification. The TSO covers the article. Both should be in the record, separately, so an inspector can pull either one without reading a paragraph of my handwriting.

I also want — and this is the thing no software has ever done — I want the software to tell me if the TSO I'm linking is cross-referenced to the right aircraft type certificate data sheet. Not automatically, necessarily. But if I link TSO-C146d to an install and the aircraft's TCDS doesn't list GPS as an approved navigation system, I want a flag. Not a hard block. A flag that says "verify TCDS and AFM amendment before sign-off." That would catch things.

**Nadia:** Let's talk about bench tests. A unit comes off an aircraft, you test it on the bench — what does that documentation look like right now, and what should it look like?

**Dale:** Right now: the Aeroflex prints a test report. It's a PDF. I print it or I save it to a folder. I write a note in the EBIS 5 work order: "See bench test record dated [date]." The bench test record is in a folder in the back room or in a network directory. If the inspector wants it, I find it. It's not linked to the work order in the software.

What it should look like: the bench test report — or at minimum the test result summary — should be attached directly to the maintenance record entry in the software. Not the work order. The maintenance record. And the link should be bidirectional — I should be able to pull up the bench test from the maintenance record, and I should be able to pull up the maintenance record from the bench test log. Right now there's no linkage at all.

I wish the software would let me define test equipment profiles — I have my Aeroflex, my Barfield, my King KTS 150D DME tester — and then when I create a maintenance record, I pick from my equipment list and it pulls in the P/N, S/N, and calibration date automatically. I update the cal date when it gets recalibrated. That's it. No manual typing. No forgotten notation.

*[Marcus]: The bench test documentation becomes particularly important when you're doing IFR return-to-service work. Have you had FAA inspectors ask about bench test records specifically?*

**Dale:** Three years ago. A surveillance inspection. The inspector wanted to see the calibration records for the test equipment I used on a pitot-static check. I had the calibration certificate — it was in the folder — but finding it took twenty-five minutes because the folder had three years of accumulated calibration certs in no particular order. He was polite about it. He noted in his report that the records were "organized in a manner that impeded timely retrieval." That was the professional way of saying my filing system was a disaster.

After that inspection, I organized the folder. But organizing a physical folder is not the same as solving the problem. The folder is only as organized as the last time I organized it. Software with mandatory fields and file attachments solves it structurally.

**Nadia:** Last question — you work on multiple aircraft simultaneously. If you could redesign the software's task-tracking view from scratch for how you work, what would it look like?

**Dale:** I want a board. Like a Kanban board but for my aircraft. Each column is a tail number. Each row in the column is an open task on that aircraft. The task has a status — pending, in progress, awaiting parts, awaiting bench test, awaiting sign-off, signed off. I can drag a task from "in progress" to "awaiting bench test" when I pull the unit. The task stays associated with the work order for that aircraft and the specific maintenance record. But I see all my aircraft at once.

And I want to be able to add a "bench test in progress" note on the task — which unit is on the bench, what I'm testing for, estimated completion. Right now that's on a sticky note on the unit itself.

The current system assumes I'm a one-aircraft-at-a-time technician. I'm not. Most avionics shops aren't. You're waiting on parts, you're waiting on the Aeroflex to run its cycle, you're waiting on a test pilot to get back from a function check. You're always juggling. The software should help me juggle. Right now it assumes I'm standing next to one plane and doing one thing.

I wish the software would understand that avionics work is multi-threaded and give me a multi-threaded view. That's the core of it.

**Nadia:** That's helpful. Thank you, Dale. Marcus, any final questions?

**Marcus:** One. From a compliance standpoint — when you sign a maintenance record in the current system, what exactly are you attesting to?

**Dale:** [Pauses.] In theory, I'm attesting that the work was performed in accordance with the applicable maintenance data, that the aircraft or article is in airworthy condition, and that I'm exercising the appropriate privileges under my certificate. In practice, in EBIS 5, I'm clicking a button and entering my employee number. There's no summary. There's no "here is what you are signing." I'm signing based on what I know I did — not based on what the record says I did.

That gap is a problem. If the record is wrong and I signed it, I've certified a wrong record. A system that shows me the complete maintenance record — work performed, parts installed with P/N and S/N, test equipment referenced, approved data cited — before it asks for my signature is a system I can trust. That's what I want. I want to know exactly what I'm signing before I sign it.

**Nadia:** Noted. That's the most important thing you've said in this conversation.

**Dale:** I know.

---

## Key Requirements Extracted

| # | Requirement | Dale's Words |
|---|---|---|
| AVN-01 | Test equipment fields on maintenance records (not work orders) — P/N, S/N, cal cert number, cal expiry date | *"Test equipment belongs on the maintenance record... I might have six maintenance records against one work order, each with different test equipment."* |
| AVN-02 | Test equipment library / profiles — persistent records per equipment item | *"I want to define test equipment profiles... pick from my equipment list and it pulls in the P/N, S/N, and calibration date automatically."* |
| AVN-03 | Calibration expiry warning (not hard block) on sign-off | *"Warn, don't block."* |
| AVN-04 | TSO number as a structured field on part installation records, separate from STC/337 reference | *"The TSO number should be a field on the part record — structured, not a text note."* |
| AVN-05 | STC and FAA 337 number as structured fields, separated from TSO field | *"Both should be in the record, separately."* |
| AVN-06 | Bench test record attachment on maintenance record (not just work order) with bidirectional linkage | *"Attached directly to the maintenance record entry... the link should be bidirectional."* |
| AVN-07 | Multi-aircraft task board — columns by tail number, rows by task, drag-to-update status | *"A board. Each column is a tail number."* |
| AVN-08 | Sign-off summary screen — full maintenance record displayed before signature is requested | *"I want to know exactly what I'm signing before I sign it."* |

---

*Interview concluded 14:48 local. Dale escorted us out through the hangar and pointed out the Baron with the autopilot install in progress — "that's the one I'll test your software on first, if we go that way."*

*Nadia's note: Schedule follow-up with Marcus specifically on AVN-01 and AVN-04 — test equipment traceability and TSO documentation are likely underspecified in Phase 2's parts and maintenance record schemas. May require schema additions before pilot deployment.*
