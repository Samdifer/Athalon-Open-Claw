# Interview — Erik Holmberg
**Lead A&P Mechanic, Powerplant Specialist**  
**Interviewers:** Nadia Solis (PM), Tanya Birch (Mobile/Offline)  
**Format:** 75-minute working session, TriState Aviation Services conference room, Wichita, KS  
**Date:** 2026-02-22  
**Transcribed and condensed by:** Nadia Solis

---

*Erik was already seated when we arrived, coffee in front of him, a pocket notebook open on the table. He shook hands, sat back down, and said: "I've got four things I want to make sure we cover. Tell me when you're ready."*

*We were ready.*

---

**Nadia:** Let's start with you. You've been doing powerplant work for twenty years, including overhaul work. What's the single biggest difference between how you think about engine maintenance records versus how a typical line mechanic might think about them?

**Erik:** A line mechanic thinks about the work order. I think about the component. Those are different mental models and they produce different software requirements.

When you think about the work order, you're asking: "What did we do this visit?" That's fine. That's useful. But an LLP — a life-limited part — doesn't care about your work order. A compressor turbine disk doesn't reset at the start of a new work order. It has one life that spans the entire operating history of that engine, regardless of which shop touched it last. So if your software is organized around work orders, you will eventually lose track of a component's real accumulated time. Not because of malice. Because the data model is wrong.

**Nadia:** When you say "lose track" — can you be specific about what that looks like?

**Erik:** Yes. *(He opens the pocket notebook.)* I caught one of these in 2019. PT6A-42. LLP tracking spreadsheet showed 6,240 cycles remaining. I did the math manually against the work orders. Delta of 420 cycles unaccounted for. Previous shop had underreported cycles on a 2014 work order. The disk had 420 more cycles on it than the record showed.

He pauses.

**Erik:** The reason I caught it is because I did the math myself. I didn't trust the system. Most mechanics trust the system. If your system can be undermined by one wrong entry in 2014, the system has a design flaw. The current cycle count should be a running sum that the software computes from every entry, and no new entry should be allowed to make the total go down. Cycles don't go backward. Time doesn't go backward.

**Nadia:** Monotonic enforcement. That's something we've built into the data model at the airframe total time level. You're saying it needs to apply at the component level too.

**Erik:** At the component level. Per serial number. And not just cycles — flight hours also. An engine with a 3,500-hour hot section limit doesn't care that you entered 3,200 hours last time and you're trying to enter 3,150 hours this time. The system should not let you do that.

**Nadia:** What about when an engine is removed from one airframe and installed in another? The hours on the airframe and the hours on the engine diverge.

**Erik:** *(He makes a gesture like this is the whole point.)* Exactly. That's why component traceability has to be independent of the work order. The component has its own record. When you remove a PT6A-42 with serial number PCE-123456 from N447DE and install it in N192AK, the component's accumulated time follows it. The work order on N447DE shows the removal. The work order on N192AK shows the installation. The component record shows both. That's three linked records, and all three have to be consistent. Right now our system — Corridor — handles this badly. The component history is a mess of PDF attachments and whoever-remembers-what.

---

**Nadia:** Let's talk about 8130-3s. You have strong opinions about how they should be handled in software.

**Erik:** I want them as data, not documents. That's my position.

**Nadia:** Explain the difference.

**Erik:** A scanned 8130-3 in a parts folder is better than nothing. It's maybe 20% of what I need. What I need is the data on the form — part number, serial number, description, approval basis, who signed it, what shop, what date. Structured fields. Because if I have structured fields, I can query them. I can ask: "Show me every component in the shop with an 8130-3 signed before 2020." I can ask: "Is serial number AF-29847-22 in my inventory?" I can cross-reference.

*(He taps the notebook.)*

**Erik:** Three years ago I suspected a parts supplier was delivering components with forged 8130-3s. The serial numbers didn't look right to me. I couldn't prove it in our system because the 8130-3s were scanned PDFs in a folder. To check, I had to manually open twelve PDF files and read them. I found one that had the wrong approval basis code. I reported it. The supplier lost their approval. But I found it because I read twelve PDFs, not because the system helped me.

**Nadia:** The requirement being: 8130-3 data is entered as structured fields at receiving, not just scanned.

**Erik:** Correct. And — this is important — a part should not be available to issue to a work order until an 8130-3 has been entered or the part has been tagged as a reason it doesn't require one. Not a warning. A block.

**Nadia:** Hard stop.

**Erik:** Hard stop. If you can issue a part without traceability documentation, you will. Time pressure does it. Emergency AOG situations do it. And then the documentation never gets entered because the work order closed and everybody moved on. The only way to prevent that is to make it technically impossible to proceed without the documentation.

---

*Tanya enters the conversation.*

---

**Tanya:** Erik, I want to ask about the mobile side of this — specifically when you're receiving a part in the shop. What does that workflow look like today and what would it look like in an ideal world?

**Erik:** Today: part arrives, I grab the shipping box, I go to my desk, I pull up the PO in Corridor, I confirm receipt, I walk to the storeroom to physically verify the part, I walk back to the desk to enter the 8130-3 data. It's two trips. Sometimes three if there's a discrepancy.

**Tanya:** What should it look like?

**Erik:** I should be able to do the whole thing at the receiving dock. I scan the box barcode — or enter the tracking number — the PO comes up on my phone or tablet. I verify the line items against what's in the box. I photograph the 8130-3. The system reads the part number and serial number from the photo — I understand OCR exists — and populates the fields. I confirm. Done. I put the part on the shelf and the part is in the system before I leave the dock.

**Tanya:** What about connectivity at the receiving dock?

**Erik:** Our dock is in a metal building attached to the back of the hangar. Connectivity is worse there than anywhere else in the shop. If I'm doing this on a mobile device, it has to work in a degraded connection. I don't need it to be instant. I'm fine with it saying "receipt queued, will sync when connected." But I need to know the queue exists and I need to see it confirm when it syncs. Because if I think I received a part and the system didn't get it, someone is going to try to install a part that isn't in the system yet and we're going to have a traceability gap.

**Tanya:** And if you're completely offline — no connection at all?

**Erik:** I need to be able to complete the receiving workflow and have it queue. The 8130-3 photo, the part number, all of it. But —

*(He leans forward slightly.)*

**Erik:** The part cannot be available to issue to a work order until the queue syncs and the server validates it. Offline receipt means "I have this part and I'm documenting it." It doesn't mean "the part is in inventory." That status change requires server confirmation. There's a difference and the software has to make that difference visible.

---

*Back to Nadia.*

---

**Nadia:** Let's talk about LLP tracking specifically as a feature. You have a spreadsheet with 847 rows. What does Athelon need to do to replace that spreadsheet?

**Erik:** *(He thinks.)* Three things.

One: I need to see, per engine serial number, every LLP and its current status. Not filtered by work order. By component. Give me a view that says: "PT6A-42, S/N PCE-123456 — here are your 14 LLPs, here is each one's limit, here is each one's accumulated time, here is each one's remaining time." That view should exist and it should be one screen.

Two: When that engine is inducted into a work order, the LLP status should be pre-populated from the component record. I shouldn't have to re-enter the accumulated time. The system should know it already and I should be confirming it, not creating it.

Three: If I'm about to close a work order and an LLP on the engine is within — let's say 100 cycles of its limit — the system should flag it. Not block. Flag. Because I might know about it. But it should make sure I know about it before I close the work order and the customer flies away.

**Nadia:** That's a very specific set of requirements. Last question: fill in the blank — "I wish the software would..."

**Erik:** ...treat every part like someone's life depends on it. Because sometimes it does. If that means more fields at receiving, more confirmation steps at install, more warnings when something doesn't add up — fine. Add those steps. I'll do them. What I won't do is work in a system that lets me skip the traceability because it was inconvenient, and then hands me a clean record that's actually garbage.

*(Pause.)*

**Erik:** Also — I wish it would let me look up any serial number in the system and immediately see everywhere that part has ever been. What work orders. What aircraft. What date installed, what date removed. Because the single best defense against a parts error is knowing the whole story of a component. Right now, I can't do that in any system I've ever used.

---

*Interview ended. Erik closed his notebook. He had covered all four bullet points.*

---

## Extracted Requirements

| Requirement | Priority | Source |
|---|---|---|
| LLP accumulated time is monotonically enforced per component serial number (cannot decrease) | Critical | Erik |
| Component traceability record is independent of work order — follows the serial number across shops/aircraft | Critical | Erik |
| 8130-3 data entered as structured fields at receiving (part#, S/N, approval basis, approver, date) | Critical | Erik |
| Part status cannot advance to "available" without valid 8130-3 entry or documented exception | Critical | Erik |
| LLP dashboard per engine serial number — all LLPs, limits, accumulated time, remaining time, one screen | High | Erik |
| LLP status pre-populated at work order induction from component record | High | Erik |
| LLP approaching-limit flag at work order close (configurable threshold, not a block) | High | Erik |
| Serial number lookup returns full cross-shop installation/removal history | High | Erik |
| Offline receiving workflow queues to server; part not "available" until server confirms | High | Erik + Tanya |
| Receiving workflow completable at receiving dock on mobile — scan, photo, confirm — no desk trip required | Medium | Erik |
| 8130-3 OCR to auto-populate fields from photograph | Medium (Phase 2) | Erik |
