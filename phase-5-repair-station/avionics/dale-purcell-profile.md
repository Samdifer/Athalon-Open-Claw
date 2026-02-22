# Technician Profile — Dale Purcell
**Specialty:** Avionics  
**Role:** Avionics Technician / Lead Avionics Inspector  
**Organization:** Desert Raptor Aviation (Henderson, NV) — Part 145 Repair Station  
**Interview Date:** 2026-02-22  
**Interviewed By:** Nadia Solis (PM), Marcus Webb (Compliance) observing

---

## Certification & Credentials

- **14 CFR Part 65:** A&P with full Airframe and Powerplant ratings
- **Specialized Avionics Training:** AVIXA-certified; Garmin G1000/G3000 avionics factory-trained (Garmin OEM level 2 course, 2019); Honeywell Primus Epic Level 1 course (2021); Aspen Avionics authorized dealer training (2020)
- **Shop Authorization:** Listed on Desert Raptor's FAA Form 8000-4 (Repair Station Certificate) in the avionics ratings section under both Limited Rating: Radio and Instrument
- **TSO Reference Library:** Maintains personal copies of TSO-C119e (TCAS), TSO-C146d (WAAS GPS), TSO-C119b (Mode S transponder), TSO-C10b (altimeter), and a half-dozen others in a binder on his bench
- **Years of Experience:** 17 years total; 12 in avionics-specific work; 9 at this repair station

---

## Background

Dale Purcell grew up in the military surplus world — his father ran a radio repair shop in Henderson, Nevada, and Dale was taking apart CB radios at twelve. He went to SAIT Polytechnic in Calgary on an electronics program scholarship, then returned to the US, got his A&P, and spent three years at a regional avionics retrofit house in Tucson before joining Desert Raptor.

He is methodical to a fault. His bench is arranged like an operating room — every test probe has a hook, every BNC adapter is in a labeled drawer, every calibration tag is current. He doesn't talk much during actual diagnostic work. He talks constantly when explaining what he just found.

He has a genuine evangelical streak about TSO compliance. He's caught two shops — not his — doing avionics installs that were technically flying without a valid STC or TSO, and he considers those the most dangerous situations in GA because they're invisible to flight crews who assume everything in the panel is certified. When he finds something wrong with documentation, he stops the job until it's resolved. His previous supervisor called this a liability. His current DOM (Sandra Mercado) calls it the reason she hired him.

---

## Work Pattern

Dale regularly works across three to five active aircraft simultaneously. His typical week at Desert Raptor:

- **Monday:** Opens the week with an avionics bench test on a GTN 750Xi that came out of a 172 for a calibration check. Has two aircraft in the hangar for avionics upgrades (one 182 getting a G3X Touch retrofit, one Baron getting a new autopilot STC install). Has one aircraft on the ramp being prepped for IFR return-to-service after his team replaced a failed ADC.
- **Tuesday–Wednesday:** Splits time between the active installs. Coordinates with the airframe techs on wire routing for the autopilot install.
- **Thursday:** Bench tests, calibration runs. Documents test results. RVSM compliance checks if applicable.
- **Friday:** Return-to-service paperwork, test flight coordination, function check flight signoffs.

He tracks his own aircraft concurrently by a whiteboard system he devised eight years ago, with tail numbers across the top and task status down the left side. It's covered with dry-erase marks, arrows, and abbreviations no one else fully understands. He knows it's fragile. He's said so repeatedly.

---

## Specific Pain Points with Current Software (EBIS 5)

### 1. Test Equipment References Are Not Part of the Record
Every bench test Dale runs is performed with calibrated test equipment. His Aeroflex 2050T IFR Nav/Comm Test Set has a calibration certificate with a calibration date and a next-due date. His Barfield 1811FA pitot-static test set has the same. Under 14 CFR Part 43 and the applicable TSO requirements, the test equipment used to verify avionics performance should be traceable in the maintenance record. Dale currently writes this in a paper test log and attaches it to the work order folder. EBIS 5 has no field for it. The inspector who asked about it three years ago had to review a physical folder of printouts.

### 2. Bench Test Records Are Orphaned from the Work Order
When Dale performs a bench test on a unit — a comm radio, a nav receiver, an ADF — he generates a test sheet on his Aeroflex. That sheet prints to a PDF. He prints it and staples it into the work order folder. Alternatively, he scans it to a network folder in a directory he named "BENCH TESTS — AVIONICS — 2024/2025/2026." The naming is consistent only because he enforces it personally. If he were on vacation when someone ran a bench test, the file would land somewhere else. There is no linkage between a scanned document and a specific work order or maintenance record in EBIS 5.

### 3. TSO Compliance Documentation Is Manual and Untrusted
When Dale installs a TSO'd article — a new transponder, an ADS-B out unit, an ELT — he has to verify that the article's TSO authorization, the installation STC (if required), and the aircraft type certificate all align. He does this from memory, from his personal binder, and from a call to the DER he's worked with for six years. EBIS 5 has a "certification notes" free-text field on the maintenance record. Dale writes the TSO numbers, STC numbers, and DER reference in there, in his own notation format. The notation is not standardized. Another tech reading it would need to know Dale's shorthand to understand it.

### 4. Multi-Aircraft Task Tracking Requires His Whiteboard
The software has no meaningful multi-aircraft view for an avionics tech. EBIS 5 shows him work orders one at a time. He cannot look at a single screen and see: "I have a VOR check pending on N1234A, a bench test in progress for N5678B's comm, and an STC install awaiting sign-off on N9012C." That view lives only on his whiteboard. If he's away from the shop — at a customer aircraft, at training — someone calling to ask the status of N9012C has to ask his apprentice, who has to interpret the whiteboard.

---

## Opinions on Aviation Software

**On the industry generally:**  
> "Aviation software was designed by people who understood compliance requirements but didn't understand how the work actually gets done. Every system I've ever used handles the end — the signature, the record — and ignores the middle, where the actual diagnostic work happens. That's backwards. The middle is where errors occur."

**On electronic signatures:**  
> "I'm not opposed to electronic signatures. I'm opposed to electronic signatures that don't tell me exactly what I'm signing. I want to see the aircraft N-number, the component P/N and S/N, the test equipment references, and the work performed — all of it — before I put my certificate number on it. If I can't see it, I'm signing blind."

**On test equipment and compliance:**  
> "Every TSO has performance requirements. Every performance requirement has a test procedure. Every test procedure requires calibrated equipment. That chain has to be documented. If the software doesn't have fields for it, someone is going to forget to document it, and then someday a 172 on an ILS approach is going to have a VOR receiver that was 'repaired' with uncalibrated equipment and nobody checked the output. I lose sleep about this."

---

## What He Hopes Software Could Do

Three stated requirements, in his words:
1. **"Let me attach test equipment records — with equipment P/N, S/N, and calibration date — to a specific maintenance record, not just to a work order."**
2. **"Give me a multi-aircraft task board — my tail numbers down the side, my open tasks listed under each one — so I can see my whole workload without walking to a whiteboard."**
3. **"Put TSO article fields on the parts form. Part number, serial, the TSO number it was authorized under, the STC or FAA 337 that covers the installation. I should be able to link those at receiving, not reconstruct them at sign-off."**

---

## Notes for the Team

- Dale will be the most technically demanding tester in any pilot program. He will use the system exactly as the regulations require and flag any gap.
- His relationship with Sandra Mercado (DOM) is strong. She trusts his compliance instincts. His buy-in is nearly as important as Sandra's.
- He's particularly interested in whether Athelon can generate a maintenance record that he could hand to an FAA Aviation Safety Inspector without additional paperwork. That's the test he will apply to every sign-off.
- He's skeptical of demo environments. He wants to use the software on a real work order with a real aircraft before he evaluates it.
- His apprentice, Maya Torres (2 years, fresh A&P), will be the secondary avionics user if Desert Raptor adopts Athelon. Design for Maya's learning curve while not insulting Dale's expertise.
