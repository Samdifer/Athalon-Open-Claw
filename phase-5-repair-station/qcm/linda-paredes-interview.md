# Interview Transcript — Linda Paredes
**Role:** Quality Control Manager, Skyline Turbine Services, KMQY
**Interview conducted by:** Nadia Solis, Product Manager, Athelon
**Observing:** Capt. Rosa Eaton (Ret.), Aviation Technical Advisor, Athelon
**Date:** 2026-02-22
**Location:** Skyline Turbine Services — QCM office (smaller than Gary's, quieter, no hangar view)
**Duration:** 61 minutes
**Format:** Semi-structured. Linda had prepared notes. Nadia took notes throughout. Rosa observing.

---

*[Context: Linda's office is organized to the point of being slightly unsettling. Every binder is labeled. A wall-mounted whiteboard shows the current open discrepancy log with days-open in red marker. A post-it on her monitor reads: "If you can't find it in 5 minutes, it doesn't exist." She arrived to the interview with a yellow legal pad covered in her own questions. She asked if she could ask some of hers. Nadia said yes.]*

---

**NADIA:** Linda, thank you for making time. Before I get into questions, I want to say — Gary mentioned that the 2023 inspection was formative for you in terms of what you need from software. Can we start there?

**LINDA:** Sure. But I want to be clear that the inspection went fine. We passed. What it showed me was where the cracks are, not where the building fell down. *(She flips open her legal pad.)* I've been making notes for this conversation since Gary told me you were coming.

**NADIA:** Please, go ahead.

**LINDA:** The inspector asked for records on forty-seven work orders. Forty-four were easy. Three took forty minutes because the N-number for one of our aircraft was entered three different ways across three different work orders in Corridor. "N12345," "12345," and "N-12345." All the same airplane. Corridor's search is literal — it doesn't know those are the same aircraft. I want you to understand: this is not a user error I can train away. The software let those three entries happen. It should not have.

**NADIA:** So format validation at input.

**LINDA:** Not even validation. Normalization. I don't want a red box that says "wrong format." I want the system to understand that "N-12345" and "N12345" and "12345" are all the same aircraft, and to enforce one representation across every record from day one. If the software is holding records for an FAA inspection, it should be able to find them. All of them. Reliably.

**NADIA:** That's a concrete requirement. What else came out of that inspection?

**LINDA:** The inspector asked to see the audit history on two records. Who created them, who edited them, and when. I had to call Rusada during the inspection. They sent me a CSV that arrived forty-five minutes later. I had to sit with the inspector and explain what the columns meant. *(She stops.)* Does that seem acceptable to you?

**NADIA:** No.

**LINDA:** It isn't. I wish the software would show me the complete history of any record — creation, every amendment, every failed sign-off, every correction — directly in the interface, while I'm looking at the record, without me needing to call anyone or export anything. The inspector should be able to sit next to me and read the history himself. Not a summarized version. Not "last modified by [user] on [date]." The full event log.

**NADIA:** I want to make sure I understand "amendment" as you mean it. Can you describe what a correction looks like in your current process?

**LINDA:** Under AC 43-9C and basic recordkeeping standards, if there's an error in a maintenance record, the correct procedure is: single line through the incorrect entry, write the correction, sign it, date it. The incorrect entry remains visible. That's the regulatory standard. It exists so that an inspector can see what was wrong and can verify the correction is legitimate — not an attempt to hide something.

In Corridor, if a technician makes an error in a record entry, the path of least resistance is to go back and edit the field. It overwrites the original. Depending on which version of Corridor you're running and which field was edited, the edit may or may not appear in the audit log. I found this out during the 2023 inspection, by the way — the audit logging behavior changed between version 8 and version 9, and it wasn't in the release notes.

**NADIA:** So you can't rely on the audit log being complete.

**LINDA:** I cannot rely on it. Which is why I implemented a workaround: any correction to a maintenance record in Corridor has to go through me, and I write a formal addendum note in the record's notes field with the original text, the corrected text, and the reason. The original record isn't touched. I do this by hand. For every correction. Because the software won't enforce it.

**NADIA:** What would the right software behavior be?

**LINDA:** *(without hesitation)* Signed records cannot be edited. Full stop. If there's an error in a signed record, the correction is a new record entry — an amendment — that preserves the original, states what the correction is, requires a reason, requires a signature from the person making the correction, and creates a new audit event. The original record and the amendment are linked. Both appear in the record history. An inspector looking at the record can see the original error and the correction without any additional steps.

That's what the paper standard requires. The software should be at least as rigorous as paper.

**ROSA:** *(quietly, to Nadia)* That's the append-only model. That's what Marcus built.

**LINDA:** *(she heard this)* Then you've done it correctly. Can I see it?

**NADIA:** When we have a deployed environment — yes, that's one of the first things we'll validate with you.

**LINDA:** Good. Next thing I want to ask about. *(She checks her legal pad.)* What happens to my records if Athelon goes out of business?

**NADIA:** That's a fair question. The records are in a Convex database. We're exploring options for customer-controlled export — a full records export in a standard format that can be ingested by another system or held locally.

**LINDA:** "Exploring" isn't an answer I can take to the certificate holder.

**NADIA:** Agreed. I'll come back to you with a specific answer before we ask you to pilot anything. You deserve a written commitment on that.

**LINDA:** *(making a note)* Good. Now let me let you ask your questions.

**NADIA:** *(adjusting)* Thank you. How do you manage discrepancy tracking today, and what breaks in the current workflow?

**LINDA:** Discrepancies in Corridor are attached to the work order as line items. Each one has a status — open, corrected, deferred. I review the discrepancy aging report every Monday. The report shows me every open discrepancy, how long it's been open, and its current status. The problem is that the report is a flat list — it doesn't tell me whether a deferred discrepancy is approaching its MEL category limit. I have to calculate that manually. Our MEL covers categories A through D. Category C is ten days. If a C item was deferred on February fifteenth, I need to know that by February twenty-fifth it expires. Corridor doesn't surface that. I calculate it in a separate spreadsheet.

**NADIA:** So MEL category expiry should be computed and surfaced in the discrepancy list.

**LINDA:** Automatically. Not as a report I have to pull. As a visible countdown on the discrepancy item itself. And when it's within forty-eight hours of expiry, I want a notification. Not an email I might miss — something in the dashboard that I can't ignore.

**NADIA:** *(writing)* That's in the design. What about the owner notification requirement for deferred discrepancies?

**LINDA:** That's another gap. For Part 135 customers especially, when we defer a discrepancy to an MEL item, the operator has to be notified. That notification has to be documented. In Corridor, the documentation is a free-text note I write in the discrepancy record saying "owner notified, date, method." There's no structured field for it, no verification that it happened, no link to any communication record. If an inspector asks me to prove the operator was notified, what I have is a note I wrote saying that I did it.

**NADIA:** And if you didn't write the note?

**LINDA:** Then there's nothing. Which is why I review every deferred discrepancy personally and write the note myself if the tech forgot. Which happens more than I'd like to say out loud.

**NADIA:** How do you manage QC review of closed work orders?

**LINDA:** I review every work order that closes. I'm looking for: complete maintenance records, correct signatures, AD compliance records linked and accurate, aircraft total time consistent with the logbook entry, discrepancies resolved or documented. If I find a problem, I flag it to Gary and to the responsible technician, and we create a correction. In Corridor, there's no formal "QCM reviewed" status on a work order. I keep a separate log — a spreadsheet — tracking which work orders I've reviewed and when. That log has more value to me than Corridor's status fields in some ways, because at least I know it's accurate.

**NADIA:** That's a workflow you're maintaining outside the system because the system doesn't support it.

**LINDA:** That describes about thirty percent of my job. Things I do in spreadsheets because the software can't do them, or can't do them in a way I trust.

**NADIA:** I wish the software would —

**LINDA:** *(she finishes the sentence)* — give me a formal QCM review action on every closed work order. A distinct event: QCM reviewed, date, reviewer, any findings noted. That event should appear in the work order's audit history. It should be searchable. And if a work order closes without QCM review, it should show up on my dashboard as pending review until I mark it done.

That's my job. The software should support it as a first-class action, not as a note I write in a spreadsheet.

**NADIA:** Understood. Last question — what do you look for in a maintenance record to know it's defensible?

**LINDA:** *(she doesn't hesitate)* Five things. One: the description of the work is specific enough that someone who wasn't there can understand what was done. Not "inspected per checklist." "Inspected engine mount assembly per task card TC-07, steps 1 through 14, all steps satisfactory, no defects noted." Specific. Two: the aircraft total time is recorded and matches the logbook. Three: the applicable regulation is cited — 43.9, 43.11, whatever applies. Four: the person who did the work and the person who authorized return to service are clearly identified by certificate number, not just by name. Five: if there were any discrepancies or deviations from the maintenance manual, they are documented here, not just in the discrepancy log.

If a record meets those five things, I'll sign off on it. If it doesn't, it comes back for correction before it leaves my desk.

**NADIA:** Does the software support that level of specificity?

**LINDA:** Corridor supports it if the technician fills everything in voluntarily. There's nothing in Corridor that prevents a technician from writing "inspected, OK" and calling it a maintenance record. The software has no minimum content enforcement. *(She pauses.)* I assume your system does?

**NADIA:** For certain fields, yes — there are required fields that block submission. For free-text description, we've been going back and forth on how much to enforce versus guide.

**LINDA:** *(firmly)* Enforce the minimum. You can always allow more. But if the software allows someone to create a legally insufficient maintenance record without any friction, they will. And then I'll find it during QC review, and it'll be a correction. I'd rather the software stop it before it gets to me.

**NADIA:** That's a clear product principle. Thank you, Linda.

**LINDA:** *(glancing at Rosa)* One more thing. I've talked to a lot of software vendors. Most of them talk about compliance like it's a checkbox. Like they've read the CFR and put the words in the right fields and now it's compliant. What actually makes a system compliant is whether the record it produces would survive a trained FAA inspector asking hard questions about it. That's the test. Not whether the fields are filled in. Whether a real inspector, looking at the record, would have everything they need to follow the chain of evidence.

If your system is built by people who understand that distinction, I'll work with you. If it's built by people who think compliance is a UI problem, I can't help you.

**ROSA:** *(to Linda, quietly)* That's the same thing I told them on day one.

**LINDA:** *(almost a smile)* Then we're going to get along fine.

---

*[Interview concluded. Linda remained after Nadia and Rosa left to lock the office. She was seen at her desk twenty minutes later, updating her spreadsheet.]*

---

## Requirements Extracted — Linda Paredes Interview

### REQ-LP-01: In-UI Audit History (Inspector-Accessible)
Every record (work order, maintenance record, task card, AD compliance entry, discrepancy, RTS) must have a full audit history accessible directly in the UI without any export, report generation, or support contact. The history must show: creation event (user, timestamp), every amendment event (user, timestamp, original value, new value, reason), every sign-off event (user, timestamp, auth event ID), every failed sign-off attempt (user, timestamp, reason for failure). An FAA inspector must be able to read the complete history of any record without being given a tutorial.

*"The inspector should be able to sit next to me and read the history himself."*

### REQ-LP-02: Amendment-Based Correction for Signed Records
Signed records (maintenance records, RTS records, inspection records) must not support field-level editing after signing. The correction pathway for a signed record must be: (1) select "Create Amendment," (2) enter corrected content, (3) enter required reason for correction, (4) sign amendment with re-authentication, (5) system preserves original, links amendment, creates audit event. Both original and amendment are permanently visible in the record history. No overwrite. No delete.

*"The paper standard requires the incorrect entry remain visible. The software should be at least as rigorous as paper."*

### REQ-LP-03: Aircraft Identifier Normalization
The system must enforce a single canonical format for aircraft N-numbers (and ICAO registration equivalents) at point of first entry. Variant formats (with hyphens, without "N" prefix, with leading zeroes) must be normalized or rejected at input — not flagged post-hoc in a report. All records for a given aircraft must be retrievable by a single consistent identifier search. Inconsistent identifier entry across records on the same aircraft must be impossible by design.

*"The software let those entries happen. It should not have."*

### REQ-LP-04: MEL Category Expiry Surfacing with Active Alert
Open discrepancies deferred under MEL must display their MEL category (A/B/C/D) and calculated expiry date on the discrepancy record and on the QCM dashboard discrepancy list. Within 48 hours of expiry, the discrepancy must appear as a priority alert in the QCM dashboard that cannot be dismissed without an action (extend with documentation, or mark resolved). Expiry calculation must be automatic, not manual.

*"I have to calculate it manually. The software should do this."*

### REQ-LP-05: Formal QCM Review Action on Closed Work Orders
The system must support a formal "QCM Review" action on every closed work order, distinct from any other status or note field. The action must: require QCM-role authorization, record reviewer identity and timestamp, accept optional findings notes, create an audit event in the work order history, and surface in the QCM dashboard as "pending review" until completed. Work orders closed more than 48 hours ago without QCM review must appear in the dashboard with aging indicator.

*"The software should support it as a first-class action, not as a note I write in a spreadsheet."*

### REQ-LP-06: Minimum-Content Enforcement on Maintenance Records
The maintenance record creation flow must enforce minimum required content before submission: (1) description of work (minimum character count, not just non-empty), (2) aircraft total time, (3) applicable regulation citation, (4) certifying mechanic certificate number (not just name), (5) if any discrepancy was found during the work, a discrepancy reference must be present. Submitting a maintenance record that fails any minimum-content check must be blocked with a specific error message identifying the missing element.

*"If the software allows someone to create a legally insufficient maintenance record without any friction, they will."*
