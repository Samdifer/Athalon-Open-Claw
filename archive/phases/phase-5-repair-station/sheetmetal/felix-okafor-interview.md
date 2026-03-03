# Interview — Felix Okafor, Structural Repair Technician
**Conducted By:** Nadia Solis (Product Manager)  
**Observing:** Marcus Webb (Compliance Advisor)  
**Location:** Desert Raptor Aviation — Sheet Metal Shop, Henderson, NV  
**Date:** 2026-02-22  
**Duration:** 61 minutes  
**Format:** Semi-structured. Felix had a printed maintenance record from a previous job on the table — he'd brought it as a reference point. He referred to it four times.

---

*[Note from Nadia: Felix placed a printed maintenance record on the table when we arrived. It was three pages. He'd highlighted two sections. I asked if this was his work. He said, "No. This is someone else's. I want to show you why it's wrong." He had clearly been thinking about this meeting.]*

---

**Nadia:** Tell me what good structural repair documentation looks like. Starting from scratch.

**Felix:** [Sets the printed record aside and pulls out his own.] This is a repair I did on a King Air 200 last year. Skin damage on the aft fuselage — station 469 to station 481, just aft of the pressure vessel. The damage was a dent, roughly 3.75 inches long by 1.1 inches wide at its widest point, 0.082 inches deep at the deepest. I measured it with a depth micrometer, not estimated it.

Here's what I wrote. *[Reads from the record]* "DAMAGE DESCRIPTION: Smooth dent to aft fuselage lower skin, LH side, STA 469 to STA 481, 8 inches forward of the aft pressure bulkhead attach. Dent dimensions: 3.75 in L × 1.1 in W × 0.082 in D. No cracking at dent periphery. No distortion to adjacent structure. Two fasteners within dent area: intact, flush, no pulled heads."

Then the SRM reference: "APPROVED DATA: Beechcraft King Air 200 Series Structural Repair Manual, Report No. 101-590024-27A, Revision A12, Chapter 53 — Fuselage, Section 41 — Pressure Vessel Skin, Subject 10 — Allowable Damage, Figure 53-41-10-2, Table B."

Then: "DISPOSITION: Dent is within allowable limits per Table B criteria. No repair required. Area cleaned, preserved, and inspected. Area inspected for secondary damage — none found."

That is a complete record. Someone reading it in twenty years knows exactly where the damage is, how large it is, what reference was consulted, and what the outcome was. They can independently verify my conclusion by pulling the same SRM reference and checking the same table.

**Nadia:** And the record you brought in for comparison?

**Felix:** [Slides the highlighted page across.] This came in with an aircraft we received for an annual inspection. Previous shop did a fuselage skin repair. This is the maintenance record. Read it.

*[The highlighted section reads: "Repaired damaged skin on aft fuselage per Cessna SRM. Repaired and inspected. Aircraft returned to airworthy condition."]*

**Nadia:** That's... all of it?

**Felix:** That's all of it. No location. No dimensions. No SRM chapter. No figure number. No description of the repair methodology. No fastener specification. No material specification. I don't know where on the fuselage this repair is. I don't know how large the damage was. I don't know if what they did is actually within the SRM's authorization. I don't know if a doubler was installed or if they blended the damage. I know nothing.

And they signed it. Their certificate number is at the bottom. They put their A&P number on a record that tells me nothing.

*[Marcus]: Under 14 CFR 43.9, is this record compliant?*

**Felix:** [Pause.] Marginally. At minimum. Part 43.9 requires a description of work performed. This says "repaired damaged skin." It's a description in the loosest possible sense. An FAA inspector with high standards would write them up. An inspector on a good day might not. But even if it passes a compliance check, it fails as a maintenance record. The purpose of the record is to document what happened. This doesn't document what happened.

**Nadia:** Does software contribute to records like this being written?

**Felix:** Directly. If you give a mechanic a blank text field and ask them to describe the work, they will write as much as they need to write to satisfy the minimum they believe is required. Some techs have high minimums. Most don't. A software system that provides structured fields — damage location, damage type, damage dimensions, SRM reference with chapter/section/subject broken out — prompts the tech to provide the complete information. Not because they want to, necessarily. Because the field is there and empty and the system won't let them move forward without filling it.

You can't force good writing, but you can force complete data entry. Those are different things, and both matter.

**Nadia:** Describe the structural repair record structure you'd design for this software.

**Felix:** Two separate sections, minimum. Damage section and repair section.

**Damage section:** Aircraft station and buttline or waterline reference, or fuselage area description for aircraft without published station data. Skin zone — upper, lower, side, which side. Structure type — fuselage skin, rib, stringer, spar, frame. Damage type — enum field, not free text: dent, crack, corrosion (and sub-type: pitting, intergranular, exfoliation), abrasion, puncture, disbond for composites. Dimensions — length, width, depth, all numeric. Proximity — distance to nearest fastener, nearest seam, nearest structural member, all numeric. Photos attached — mandatory field, not optional.

**Repair section:** Disposition type — enum: within-limits no repair, repair per SRM, repair per EO/DER, major repair with 337. SRM reference — structured: manual title, report number, revision level, chapter number and title, section number, subject number, and figure/table number. Separately for each element. Not one text field. Each element its own field. That makes them searchable.

If the disposition is EO or DER: Engineering Order number, DER name, DER FAA authorization number, date of DER concurrence. If the disposition involves a 337: Form 337 reference number, submission date, submission method, Aircraft Registry confirmation number if received.

**Nadia:** That's significantly more structure than any current MRO software I've seen.

**Felix:** Because most MRO software was designed for oil changes and filter replacements. A filter replacement record is simple. An oil and filter: part number, quantity, work performed, date, signature. That's a text field situation. A structural repair record is not a filter replacement record. The software shouldn't treat them the same.

Give me different record types. A "structural repair" work type that presents the structured form I described. A "routine maintenance" work type that stays simple. The tech selects the type when they create the task card, and the maintenance record form adjusts accordingly. That's not complicated to build. It's just a choice about whether the software respects the complexity of the work.

**Nadia:** Let's talk about DER coordination. Walk me through how you work with Bob Hwang on a repair that needs his sign-off.

**Felix:** Damage comes in that's beyond SRM limits, or in primary structure where I'm not comfortable with a field repair without engineering review. I write up my findings — sketch, measurements, photos. I send it to Bob via email. He asks questions. I answer. Sometimes he asks me to take more measurements. We go back and forth — could be two emails, could be eight. Eventually he issues me a disposition: either "approved per the following method" with a specific repair design, or "major repair, prepare a 337." That disposition has a number. Bob tracks it in his own records.

That whole exchange — the emails, the sketches, the final disposition — is the engineering record for the repair. Right now it lives in my email inbox and in a paper file in the back room. I attach a summary to the work order in EBIS 5, but the summary is my summary. The actual exchange is elsewhere.

What I want: the ability to create an "external engineering consultation" record in the software. I upload the disposition document — the EO or the approval letter or whatever Bob sends me — and I enter the structured fields: DER name, FAA authorization number, disposition number, date of approval, summary of approved method. That becomes part of the work order record, not a separate paper file. And when I do the return-to-service, the DER reference shows up as a referenced document in the maintenance record, not just as a text note.

**Nadia:** And the Form 337 — you mentioned eleven of these in your career. What's the worst part of the current process?

**Felix:** The disconnection. I prepare the form. I submit it. Oklahoma City receives it. The form becomes part of the aircraft's permanent record in FAA's database. But in my shop's software, the work order that generated the 337 has no reference to that form number. And if I'm looking at the aircraft three years later and I see a repair and I want to know if a 337 was filed for it, I'm searching by memory or by physical file. I want a field on the work order: "FAA Form 337 filed — form number — date submitted — submission method." Two fields. That's it. Then I can pull up any work order and immediately know whether a 337 was involved.

I wish the software would treat the Form 337 as a related document type — like a linked record — so you can navigate from the work order to the 337 reference and back. Not that the software generates the form, necessarily. The FAA has their own system for that. But I want the linkage to exist in my maintenance records, not just on paper.

*[Marcus]: In your experience with FAA surveillance inspections, what do inspectors focus on with structural repair records specifically?*

**Felix:** SRM reference completeness is always the first thing they check if they're looking at a structural repair. They want to see the chapter and section, not just "per SRM." Second is the damage description — can they identify where on the aircraft this damage was, independent of the record author? Third is the repair disposition — was a 337 required and if so, was it filed? Fourth — and this is newer, last three or four years — photo documentation. Inspectors have started expecting to see photos attached to structural damage findings. If there's no photo, they ask why.

In all three surveillance audits I've been through at Desert Raptor, my records have been the longest in the work order stack. The inspector always reads them first and then moves faster through the rest because he trusts the shop's record quality after reading mine. That's not me being arrogant. That's me saying: complete records build trust faster than short records, even with inspectors who know the regs cold.

**Nadia:** What would it take for you to trust the maintenance record that Athelon generates? Not write — generates.

**Felix:** I want to see the rendered record before I sign it. The whole thing, in its final format. Not the form I filled out — the document that would be shown to an inspector. Every field I entered, displayed as it will appear in the exported record. If there's a formatting issue — if my SRM reference is truncated, if my damage dimensions lost a decimal place — I need to see it before I sign. After I sign, the record is what it is. I need to sign something that looks right.

And the SRM reference needs to render as a complete citation, not as a database dump. If I enter chapter 53, section 41, subject 10, figure 53-41-10-2 in four separate fields, the rendered record should show that as a coherent, readable citation: "Ref: [Manual Title], Rev A12, Chapter 53, Section 41, Subject 10, Fig. 53-41-10-2." Not four separate database rows.

I wish the software would render structured fields into readable prose for the final record, while keeping the structured data searchable in the background. Those two things are compatible. You can store structure and display prose. Most aviation software does neither — it stores unstructured text and displays it as-is. That's not good enough.

**Nadia:** Last thing. You mentioned photos are becoming expected. How is photo documentation working or not working in your current process?

**Felix:** I take photos with my personal phone. I email them to the shop's shared inbox. Someone — usually the office assistant — downloads them and uploads them to the EBIS 5 work order. That process takes between two hours and two days depending on how busy the office is. I have had an inspector arrive for a review visit when the photos from a job I completed three days earlier were not yet uploaded to the work order. That conversation was uncomfortable.

What should happen: I take the photo at the aircraft. The photo goes directly into the work order record, tagged with GPS coordinates and timestamp, attached to the specific damage finding I'm documenting. From phone to record in one step. Not phone to email to inbox to download to upload to link.

I wish the software would let me photograph a finding in the app and attach it directly to the damage record I'm creating, with the timestamp and my user identity automatically embedded in the attachment metadata. That's not a future feature. That's what every other industry figured out in 2016.

**Marcus:** Felix — and this is a personal question as much as a regulatory one — what's the consequence of a structural repair record that's incomplete? The scenario where the record says "repaired per SRM" and that's all.

**Felix:** [Long pause.] Best case: an inspector flags it, writes up a paperwork violation, the shop pays a fine, the record gets amended. That's the best case.

Middle case: the aircraft changes hands. The new owner's shop does maintenance. They find the repair — the doubler, the rivet pattern, whatever was installed. They have no documentation to verify the repair meets structural requirements. They have to get a DER involved to assess the repair independently, which costs time and money. The aircraft may be grounded during the assessment.

Worst case: the repair was not adequate. Not within SRM limits, not per an approved method. Nobody knew because the record didn't say what was done. Years later, under fatigue loading, the structure fails. And the record — the record I'm showing you — is the only paper trail that exists for why that structure was the way it was.

That's the consequence. That's why I write three-page maintenance records for a dent that other techs document in one sentence.

**Nadia:** Thank you, Felix. That's the answer.

**Felix:** Give me structured fields and I'll give you complete records. That's the deal.

---

## Key Requirements Extracted

| # | Requirement | Felix's Words |
|---|---|---|
| STR-01 | Structural repair maintenance record type — distinct form with structured fields for damage and repair | *"Give me different record types. A 'structural repair' work type that presents the structured form I described."* |
| STR-02 | Damage section: location (station/BL/WL), structure type, damage type (enum), dimensions (numeric), proximity, photos (mandatory) | *"Damage location, damage type, damage dimensions, SRM reference... all their own fields."* |
| STR-03 | SRM reference as structured fields: manual title, report number, revision, chapter, section, subject, figure/table — each separately stored but rendered as a coherent citation | *"Each element its own field. That makes them searchable... the rendered record should show that as a coherent, readable citation."* |
| STR-04 | Disposition type as enum: within-limits, repair per SRM, repair per EO/DER, major repair with 337 | *"Enum field, not free text."* |
| STR-05 | DER consultation record — uploadable, with DER name, FAA authorization number, disposition number, date, summary of approved method | *"Create an 'external engineering consultation' record... that becomes part of the work order record."* |
| STR-06 | Form 337 reference on work order — form number, submission date, method, confirmation number | *"A field on the work order: 'FAA Form 337 filed — form number — date submitted.'"* |
| STR-07 | Pre-signature rendered record preview — display final maintenance record format before signature is requested | *"I want to see the rendered record before I sign it... not the form I filled out — the document that would be shown to an inspector."* |
| STR-08 | In-app photo capture attached directly to damage finding — timestamped, user-identity embedded | *"Photograph a finding in the app and attach it directly to the damage record I'm creating, with timestamp and user identity automatically embedded."* |
| STR-09 | SRM reference search across work orders by chapter/section | *"I want to be able to search my previous work orders by SRM chapter."* |

---

*Interview concluded 13:24 local. Felix walked us to the door and handed Nadia the highlighted maintenance record. He said, "Keep it. Show it to whoever writes the form." Nadia photographed it. It's in the project file.*

*Marcus's note: STR-03 and STR-07 are strong candidates for priority implementation — the structured SRM reference addresses the most common deficiency Marcus sees in Part 145 inspection records, and the pre-signature record preview directly addresses the regulatory weight-of-signature concern raised by Ray Kowalski in Phase 1 persona interviews. These two features may have the highest compliance leverage of any in Phase 5.*

*Nadia's note: STR-01 (maintenance record type) is a potential schema enhancement — current schema has a single maintenanceRecords table with a recordType enum. Adding a "structural_repair" type with a corresponding strucutralRepairDetail sub-record (or embedded fields) is feasible within the current architecture. Discuss with Devraj.*
