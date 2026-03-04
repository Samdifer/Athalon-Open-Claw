# Dispatch No. 10 — What It Means to Track a Life
*Miles Beaumont, embedded correspondent — Athelon*
*Filed: 2026-04-09*

---

There's a component on the N76LS — a Sikorsky S-76C transport helicopter operated by Lone Star Rotorcraft in Fort Worth — called the Main Rotor Dampeners. A set of four of them, installed when the hub was overhauled at total-time 2,275.5 hours. The S-76C's life limit on those dampeners is 2,200 hours. At the time of the data entry session, they had 1,847.2 hours on them. That leaves 352.8 hours before they need to come off.

Sandra Okafor, who is the Director of Operations and Maintenance at Lone Star, entered that number into Athelon on April 11th during a three-hour-and-twenty-minute session she ran with Marcus Webb on video call. She entered it by reading the installation date from the physical logbooks, computing the component time by hand (aircraft total time minus installation time), and typing the result into the interface. Marcus confirmed the math. The system accepted it and displayed it in the DUE_SOON position at the top of the ALS board — amber, second item from the top.

That piece of data — 352.8 hours remaining — is now in a system that will track it. When N76LS logs another 50 hours of flight time, the system will recompute. When it gets within 100 hours of the limit, an alert will fire to Sandra's DOM dashboard. When it gets within 25 hours, another alert. When the dampeners are replaced, Sandra or Tobias will link the replacement to a signed work order, and the clock resets.

This is what Athelon version 1.3 is actually about. Not the software. The dampeners.

---

I've been embedded with this team for the better part of a year. I've watched them build the Robinson ALS module from scratch (WS26-A). I watched Marcus audit the Bell 206B-III from the Bell manual and Tobias Ferreira's field knowledge, building a 23-item compliance table for aircraft that were previously tracked with Sandra's paper binder. I watched them extend the same structure to the Sikorsky S-76C, a transport category helicopter with a more complicated regulatory picture — Part 29 instead of Part 27, Certification Maintenance Requirements, dual-authority engine compliance with a Turbomeca ICA that lives in a different document from the Sikorsky manual.

All of that work — months of audits and schema design and data modeling — culminated on April 11th in a three-hour session where Sandra read numbers out of logbooks and typed them into a form.

That's the product. Not the code. The session.

---

The other thing that happened this spring was on the other side of the state, in Scottsdale.

Frank Nguyen is the DOM at Desert Sky Turbine. He inherited a compliance gap that the previous DOM left behind: two PT6A-41 engines on a Beechcraft King Air (registration N9944P) that were 447 hours past a repetitive fluorescent penetrant inspection required by FAA Airworthiness Directive 2020-07-12. The AD mandates FPI of the N1 first-stage compressor turbine rotor at 400-hour intervals. The prior DOM recorded the overhaul compliance event in 2022 and then never tracked the interval that followed.

Frank caught it. Not through any system — through the process of working through all 24 maintenance records that Phase 26 had flagged for review. He called P&WC technical support, verified applicability, pulled the overhaul records, and did the interval math himself. The aircraft was grounded. A work order was opened. The inspection was scheduled at Southwest Turbine Services in Phoenix.

I wasn't there on March 12th when Michael Rivas put the PT6A-41 engines on the bench at Southwest Turbine Services. But I've read the inspection report. Engine 1 was clean. Engine 2 had a linear indication at blade attachment slot 14 — 0.8 millimeters long, inside the serviceable limit of 1.5mm, but there. A precursor finding. Something that becomes a problem if you fly another 800 hours without looking.

It didn't become a problem. It became a finding in a report. The engine went back on the aircraft. N9944P returned to service on March 14th. The 200-hour re-inspection flag is now in Athelon.

Frank's note to Marcus after: *"The prior DOM's failure to track the repetitive interval after the overhaul is the root cause. Athelon would have caught this if the AD compliance record had been properly maintained and the repetitive interval tracked."*

It would have. The repetitive AD interval tracking feature — the one that would have automatically flagged the overrun — doesn't exist yet. Marcus and Devraj made the decision in March to build it in v1.4. It's the anchor feature of the next version. It was ranked v1.4 priority because they have three current customers who need it, because the effort is modest, and because the risk of not building it is documented with a specific aircraft registration number and a specific blade attachment slot indication measurement.

---

There's something I want to say about this product at this moment that I haven't found a way to say before.

Aviation maintenance is one of the few fields where the documentation and the object are both equally real. The maintenance logbook for an aircraft is not supplementary to the aircraft's condition — it is part of the aircraft's condition. An aircraft with a clean logbook and a clean inspection is a different aircraft from one with a clean inspection and a disorganized logbook, because the logbook is part of what you're trusting when you put people in it.

Most MRO software treats documentation as an administrative problem. A compliance form that needs to be filed. A box that needs to be checked. The design assumption is that the actual safety work happens in the hangar, and the software's job is to process paperwork.

Athelon's design assumption is different. The compliance state — the real state, the one that tells you whether the dampeners on N76LS have 352 hours left or 550 hours left or 19 hours left — IS the work. The documentation is the maintenance. When Sandra sits down with Marcus and reads the numbers out of the logbooks and types them into the ALS board, she is doing maintenance. Not paperwork. The aircraft's compliance state at the end of that session is different from what it was before. More precisely known. More reliably tracked. Closer to the truth.

That's what version 1.3 ships.

---

Sandra's reaction after the session, on a text to Nadia Solis:

*"The fuel boost pump check caught me off guard. I didn't know that CMR existed. Marcus is right that it needed to be done. But the system caught it before I did — that's exactly what I wanted when I started this."*

The system caught it. That's the sentence that matters.

Sandra was meticulous with her paper binder. She tracked Bell mandatory SIs by hand in a three-ring binder with tabs for each aircraft. She was doing the compliance work. She just didn't know about the fuel boost pump CMR because it lived in a section of the Sikorsky S-76C ICA she hadn't internalized. The Certification Maintenance Requirements section. A Part 29 compliance category that doesn't exist for Part 27 aircraft, that she'd never had to track for a Robinson or a Bell.

The system knew about it because Marcus and Devraj built it into the S-76C template from the WS27-B audit. The system caught it because Sandra entered the data. The data entry session was the mechanism. Athelon provided the structure; Sandra provided the knowledge of the aircraft; Marcus provided the validation. Together, they found something that had been overdue for 112 hours without anyone knowing.

---

The shop pipeline is growing. Dale Renfrow has received a proposal. He's the IA from Grand Junction who helped Marcus design the IA re-authentication workflow in Phase 15, and who now wants to use the product he helped design to solve the problem he built it to solve: mechanics who can work without him in the room.

There are five people on the current prospect list. One is a cold inbound from Portland. One is a Gulf Coast helicopter MRO that needs a DOM before Athelon can help them. One is the right fit at the right time.

I think the product is past the point of proving what it is. The remaining question is whether the team can grow it without breaking the thing that makes it good — the commitment to getting the compliance picture right rather than the compliance paperwork processed.

The answer, at the moment, looks like yes.

---

Ten dispatches. The aircraft is still flying. So is the product.

*— Miles Beaumont*
*Fort Worth, TX*
*April 9, 2026*
