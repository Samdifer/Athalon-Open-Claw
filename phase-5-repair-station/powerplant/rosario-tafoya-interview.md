# Interview — Rosario Tafoya, Engine Specialist
**Conducted By:** Nadia Solis (Product Manager)  
**Observing:** Marcus Webb (Compliance Advisor)  
**Location:** Desert Raptor Aviation — Engine Shop, Henderson, NV  
**Date:** 2026-02-22  
**Duration:** 74 minutes  
**Format:** Semi-structured. Rosie stood at the engine stand for the first half of the interview, then sat when the conversation turned to the SUP incident. She brought her personal LLP spiral notebook to the table unprompted.

---

*[Note from Nadia: Rosie met us at the engine shop door. Before I could introduce Marcus, she asked him if he was "the FAA guy." He said he was the compliance advisor. She nodded and said "close enough." The tone after that was collegial, not guarded.]*

---

**Nadia:** Walk me through what it means to track a life-limited part from the moment it arrives at your shop.

**Rosie:** Okay. Let's say a PT6A-34 comes in for a hot section inspection. The engine arrives with an engine logbook. The logbook has — or is supposed to have — a record of every LLP installed in that engine, with part numbers, serial numbers, and accumulated hours or cycles as of the last major inspection. Some of those records go back twenty years. The engine might have been through three different shops.

First thing I do: I go through the logbook and compare the LLP records to the parts I can physically see and verify. Every disk, every seal, every bearing cartridge that has a life limit — I want to find its P/N and S/N stamped or etched on the part. I compare it to the logbook entry. If they don't match, we have a problem before we've touched anything.

Once I've verified the identity — part number matches, serial number matches, accumulated life from the logbook appears credible — I log the part in our system. In EBIS 5, that means I create a parts record for each LLP. I enter the P/N, the S/N (if the field accepts it — sometimes EBIS doesn't enforce it), and I put the accumulated hours in a notes field because there's no dedicated "accumulated life" field for an LLP in EBIS 5. Then I do the hot section, I record whatever work was performed, I reinstall the serviceable LLPs, and I close the work order. The new accumulated hours are written back into the notes field manually.

**Nadia:** The "notes field." That's where the accumulated life lives in your current system?

**Rosie:** That's where it lives. Text field. Whatever I type. There's no validation, no calculation, no carry-forward. If the engine goes to another shop after leaving here, they read my notes and type their own numbers into their notes field. The accumulated life is in a chain of text paragraphs. It's not in a structured database. It's not computed from an installation history. It's whatever the last tech typed, and that is a very different thing.

*[Marcus, leaning forward]: Has the mismatch in accumulated life records ever resulted in a documented discrepancy you had to resolve?*

**Rosie:** Three times I've caught it. Once it was a transcription error — the hours were transposed. 1,285 became 1,825. Forty hours difference in favor of the part, which sounds small, but for a turbine nozzle guide vane with a 2,000-hour limit, forty extra hours matters. I caught it because I keep this *[holds up spiral notebook]* and I had recorded this specific part from a previous job at another shop. The number didn't match.

The second time was a different P/N than what the logbook said. The part that was in the engine was a -21 dash number. The logbook said -17. Those have different life limits. The -17 had 400 more hours remaining than the -21 at the same accumulated life total. That's not a small discrepancy. That's a different part.

Third time I won't get into fully because it involves the SUP situation.

**Nadia:** Tell me about the SUP situation. As much as you're comfortable.

**Rosie:** 2022. PT6A-34 first-stage power turbine nozzle. Came from a vendor we had used before, not a brand-new source. Arrived with an 8130-3. Looked normal in about 0.3 seconds. I keep looking after 0.3 seconds.

Block 13 — status/work — said "overhauled." That means the part went through an overhaul facility, was disassembled, inspected, and returned to service. Fine. But Block 12 — life remaining — said the part had 100% of its life remaining. A turbine nozzle that has been overhauled does not have 100% of its original life remaining. Overhaul extends life but doesn't restore it to zero. The life remaining is calculated from the original manufacture date and the cycles accumulated through all previous service plus the overhaul shop. An overhauled nozzle showing 100% remaining is either brand-new (in which case Block 13 should say "new," not "overhauled") or the life data has been falsified.

Second flag: Block 17 — approval number. The repair station certificate number. I know the active shops in the PT6A space. I had a sense that the number didn't look right. I looked it up in the FAA's Repair Station Locator online. The certificate had been surrendered in March 2020. The 8130-3 was signed in August 2021.

I put the part in a red-tagged box, walked it to a back shelf, and called the FSDO.

**Nadia:** What did you do in the software at that point?

**Rosie:** [Pauses.] I created a note in the work order. I wrote "QUARANTINE — suspect 8130-3 — see DOM." I physically labeled the box. I called Sandra. I called the FSDO. I filled out the SUP report on paper. There's no quarantine workflow in EBIS 5. There's no flag. There's no notification. There's no audit trail from "part received" to "part suspected" to "part reported." I created that trail on paper and kept it in a file.

If you ask me what a software system should have done: the moment I flag a part as suspect, the system should lock it out of installation on any work order in the shop. Not just this work order — any work order. It should notify the DOM automatically. It should generate a draft SUP report with whatever information it already has — the 8130-3 data I entered during receiving, the vendor, the receiving date. And it should create an immutable audit trail from receipt to disposition. Everything I did manually, on paper, under stress — the software should do that automatically, in sequence, with no way to skip a step.

*[Marcus]: Under FAA Order 8120.11, the SUP report has specific fields — source of the part, the nature of the suspicion, the part identifying data. Would you expect the software to generate that report automatically, or would you want to review and complete it manually?*

**Rosie:** Auto-populate what it knows, let me complete what it doesn't. The 8130-3 data — part number, serial number, approval number, form tracking number — should all pre-fill from what I entered during receiving. The narrative — what I observed that made it suspicious — has to be my words. You can't auto-generate a regulatory narrative. But giving me a blank form to fill out when I'm already stressed and on the phone with the FSDO is inhumane. Pre-fill what you have. Let me add what you don't.

**Nadia:** Let's talk about LLP tracking in software more broadly. If you were describing what you need for a turbine engine — not an airframe — what's different?

**Rosie:** The engine needs to be its own entity in the software. Not just "a part installed on an aircraft." An engine has its own total time, its own cycles, its own LLP status record, and it moves between aircraft. That PT6A-34 might fly on N1234 for five years, then get pulled and installed on N5678. Its accumulated life continues. Its LLPs are tracking to their limits regardless of which airframe it's bolted to. The software needs to support that.

Right now in EBIS 5, parts are tracked against an aircraft. If I remove an engine from N1234 and put it in the shop for a hot section inspection, the parts records for the LLPs inside that engine are... what? They're not on N1234 anymore, but I haven't installed the engine on N5678 yet. The software doesn't have a good answer for that.

I want a tracked engine object — call it an "engine module" — with its own serial number, its own total time and cycles, its own LLP status dashboard. Every LLP inside that engine is tracked against the engine, not against the airframe. When the engine installs on an airframe, the engine's hours start accumulating based on the airframe's hours log. When it's pulled, the hours freeze. When it installs on a different aircraft, they start accumulating again from the new aircraft's hours. That's how it works in real life. The software should model real life.

**Nadia:** What does the LLP status dashboard look like in your mind?

**Rosie:** List view. Every LLP on the engine. Columns: part description, P/N, S/N, life limit (hours or cycles or both), total accumulated life, remaining life, percent remaining, status — green, yellow, red. Color threshold: green above 20% remaining, yellow 10 to 20%, red below 10%. Below 5%, I want a banner. Below zero, I want the part locked from installation and the DOM notified.

And I want to be able to print that table as a shop card for the engine. When the engine leaves my shop, the customer gets a printout of the LLP status table as part of their return-to-service package. Right now I make that table in Excel for every engine I work on. It takes me forty-five minutes. The software should generate it from the data it already has.

I wish the software would compute remaining LLP life automatically from the part's accumulated history, update it in real time as aircraft hours are logged, and alert me before — not after — a part reaches its limit. The Aeroflex does this for instrument calibration intervals. There's no reason the maintenance software can't do it for engine LLPs.

**Nadia:** One final area — P/N and S/N. You mentioned serial numbers are sometimes missing on arriving LLPs. What should a receiving workflow require?

**Rosie:** For a life-limited part, serial number is not optional. If a serialized LLP arrives without a serial number, it should not be receivable into inventory in the software until either a serial number is entered or a receiving inspection note explicitly documents why there is no serial number — which itself requires an explanation, because most life-limited turbine parts leave the OEM serialized from the factory. A missing serial number on a life-limited part is a flag, not a default. The software should treat it that way.

The current system lets me create a part record without a serial number. No warning. No flag. Just an empty field. That's wrong. For LLPs specifically: the serial number field should be mandatory and the system should validate that the same serial number isn't already in the system under a different record — because if I'm receiving an LLP with a serial number that's already in the database, either I have a duplicate in front of me or someone made a data entry error. Either way, I want to know before I put it on a shelf.

I wish the software would make it impossible to create an LLP part record without a serial number, and impossible to install an LLP without a complete traceability chain back to its origin documentation. Those two things together would prevent a category of mistakes that currently has no systematic defense.

**Marcus:** When you verify the 8130-3 on receipt — the process you described, where you're reading it in detail — does that verification get documented in your current system?

**Rosie:** No. I perform it. I initial the paper copy. That initials is in the physical file. In the software, there's nothing. A receiving inspection entry in EBIS 5 says "received" and maybe a date. It doesn't record who verified the 8130-3, what they verified, and what their conclusion was. The software treats receiving as a stock transaction, not a compliance event. It is absolutely a compliance event.

I want a receiving inspection step — mandatory for LLPs and turbine components, optional-but-recommended for others — where I enter: verified P/N matches, verified S/N matches, verified 8130-3 Block 13 (status) is consistent with accumulated life in Block 12, verified approval number is from an active certificated facility. Checkboxes. My signature. Date and time. That record is part of the traceability chain for that part, forever.

**Nadia:** That's specific enough to implement. Thank you, Rosie.

**Rosie:** Good. Send me the prototype when it's ready. I'll break it.

---

## Key Requirements Extracted

| # | Requirement | Rosie's Words |
|---|---|---|
| PWR-01 | Engine as a first-class tracked entity with its own TT, cycles, and LLP dashboard, independent of airframe | *"The engine needs to be its own entity in the software... not just 'a part installed on an aircraft.'"* |
| PWR-02 | LLP life accumulation carries across install/remove cycles and across airframes | *"Its accumulated life continues. The software needs to model real life."* |
| PWR-03 | LLP status dashboard: P/N, S/N, limit, accumulated, remaining, percent, color-coded status | *"List view. Every LLP on the engine. Columns: description, P/N, S/N, life limit, accumulated life, remaining..."* |
| PWR-04 | Printable LLP status table for engine return-to-service package | *"The customer gets a printout of the LLP status table as part of their return-to-service package."* |
| PWR-05 | Serial number mandatory for life-limited parts — receiving blocked without S/N or documented exemption | *"For a life-limited part, serial number is not optional."* |
| PWR-06 | Duplicate S/N detection on LLP receipt — same S/N in system triggers review, not silent acceptance | *"If I'm receiving an LLP with a serial number that's already in the database... I want to know."* |
| PWR-07 | Suspect part quarantine workflow: auto-lockout from any work order, DOM notification, pre-populated SUP report draft | *"The system should lock it out of installation on any work order... generate a draft SUP report."* |
| PWR-08 | SUP report: auto-populate from existing 8130-3 and part records; narrative field for technician completion | *"Pre-fill what you have. Let me add what you don't."* |
| PWR-09 | Mandatory receiving inspection verification step for LLPs — checkboxes, signature, date/time | *"I want a receiving inspection step... that record is part of the traceability chain for that part, forever."* |
| PWR-10 | LLP life alerts at 20% / 10% / 5% remaining; install block at 0; DOM notification at 5% and 0 | *"Below 5%, I want a banner. Below zero, I want the part locked... and the DOM notified."* |

---

*Interview concluded 15:52 local. Rosie walked us back through the engine shop and showed us the quarantine shelf — one red-tagged turbine component in a labeled box. She said she'd quarantined it yesterday and the FSDO call was scheduled for this afternoon. She noted this without fanfare. This is just what she does.*

*Marcus's note: PWR-01 (engine as tracked entity) is a potential schema addition — the current schema models engines as installable parts on aircraft, not as independent tracked objects. This needs a dedicated design discussion before pilot scope is confirmed. The engine module concept may require its own table with a separate LLP sub-record set.*

*Nadia's note: Rosie's receiving inspection workflow (PWR-09) aligns with Devraj's Phase 2 spec for receiving inspection creating a maintenanceRecords entry — but Rosie is describing something more structured (checkboxes per verification item, not free text). May need a dedicated receivingInspectionChecklist sub-record for engine components. Flag for schema discussion.*
