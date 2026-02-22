# Linda Paredes — Quality Control Manager
**Pronouns:** she/her | **Age:** 46
**Station:** Skyline Turbine Services, LLC — Part 145 Repair Station, Smyrna, TN (KMQY)
**Certificate:** A&P — Airframe & Powerplant (2003)
**Years in Aviation Maintenance / QA:** 22
**Years as QCM at Skyline:** 7

---

## Background

Linda Paredes did not arrive in aviation through the traditional route of hanging around airports until someone hired her. She spent six years as a Quality Assurance Inspector (QAI) with the United States Air Force, working on C-130H airframes at Little Rock AFB in Arkansas, where she was part of the 19th Airlift Wing. Military maintenance taught her one thing above all else: if it isn't documented, it didn't happen. Not in a philosophical sense — in a legal, operational, and career-ending sense. She shipped out of the USAF in 2001, earned her A&P in 2003 while working as an airframe tech at a Memphis freight operator, and spent four years in quality roles at a Part 145 avionics shop in Nashville before Gary Hutchins hired her as QCM at Skyline in 2019.

She has been through three FAA Part 145 surveillance inspections as QCM — one routine biennial, one complaint-triggered (she is legally prohibited from discussing the specifics, but it was not Skyline's fault, and it was resolved in their favor), and one focused inspection in 2023 that lasted three days and examined forty-seven work orders across two years of records.

The 2023 focused inspection is what she talks about when people ask her what good software looks like. What the inspector asked for, how long it took to produce it, which records were easy to find and which required Gary to spend forty minutes in Corridor running queries — that experience defined her requirements list for any system she will ever sign off on.

She is not Gary's subordinate. She reports to the repair station certificate holder (the company owner) and operates independently of the DOM when it comes to quality and records compliance. This independence is deliberate and regulatory. She and Gary work well together, but she has overruled him on records questions twice since she joined, and he has respected it both times.

---

## Certifications

| Certificate | Number | Issued | Notes |
|---|---|---|---|
| A&P — Airframe | A1-3094812 | 2003 | |
| A&P — Powerplant | A1-3094812 | 2003 | |
| USAF QAI (non-FAA) | Separated 2001 | — | Foundational quality training |

She does not hold an IA. She has considered it but her job does not require return-to-service authorization — her job is to make sure the people who do authorize RTS have documented everything correctly.

---

## Career Timeline

| Period | Role | Employer | Notes |
|---|---|---|---|
| 1995–2001 | Quality Assurance Inspector (E-5) | USAF, 19th Airlift Wing, Little Rock AFB | C-130H airframe QA; mil-spec documentation standards |
| 2001–2003 | Airframe Tech (civilian) | Memphis Air Freight, MEM | Earned A&P while working |
| 2003–2007 | QA Technician | Gulf Coast Avionics (Part 145), BNA | First civilian Part 145 QA role |
| 2007–2012 | Senior QA Tech | Mid-South Aviation (Part 145), BNA | Overlap with Gary Hutchins, though different departments |
| 2012–2019 | Quality Systems Analyst | Aeroquip MRO Consulting, Nashville TN | Helped Part 145 shops build/repair their quality systems |
| 2019–present | Quality Control Manager | Skyline Turbine Services, KMQY | Full QCM authority; reports to certificate holder |

---

## Software Experience

**Corridor 9 (Rusada):** Used daily for records retrieval, discrepancy tracking, quality audits, and reporting. Has deep familiarity with its limitations. Considers its search capability "acceptable for simple queries, inadequate for cross-record traceability." Has built a supplemental audit log in Google Sheets that she maintains in parallel with Corridor because she does not trust Corridor's audit trail to survive inspector scrutiny without corroboration.

**AMOS (Swiss-AS):** Brief exposure during a consulting engagement with a Part 121 carrier. Notes that AMOS's correction workflow is superior to Corridor's but that it is priced for airlines, not GA repair stations.

**Paper:** Not a Luddite, but she will note that a paper logbook with a proper correction (line through, initials, date) is legally more defensible than a Corridor "edit" field because the paper record shows what was wrong. Corridor shows only what was last entered.

---

## What QCM Looks Like Day-to-Day

Linda's job is not to perform maintenance. Her job is to ensure that the records of maintenance are correct, complete, and retrievable — at any time, for any work order, going back to the beginning of the station's operation under the current certificate.

**Daily:** Reviews work orders that closed the previous day. Checks for: maintenance record completeness (all required fields under 43.9 and 43.11), correct IA signature on inspection items, AD compliance records linked and complete, discrepancy resolution documented or deferred with appropriate owner notification, aircraft total time logged and consistent with the logbook entry. Flags errors to Gary or the responsible technician for correction. Every correction requires a formal amendment entry — not an edit.

**Weekly:** Pulls the discrepancy aging report from Corridor. Any open discrepancy over 30 days gets a flag. Checks whether any MEL-deferred items are approaching their category limits. Reviews new AD issuances for applicability to the fleet.

**Audit preparation (ongoing):** Linda maintains a "shadow file" — an index of every work order, indexed by aircraft N-number, with a note on whether it was reviewed by QC and whether any corrections were made. If the FAA calls for a records review on any aircraft they've touched in the past two years, she wants to be able to produce those records within ten minutes.

**Post-inspection:** When a surveillance inspector leaves, Linda writes a debrief memo to the certificate holder and to Gary documenting what was examined, what was found, and what was not found. She keeps these memos in a binder on her desk.

---

## The 2023 Focused Inspection

In October 2023, an FAA FSDO inspector arrived at Skyline for a focused inspection triggered by a referral (unrelated to Skyline's work — a shared customer's aircraft had a maintenance record question at another station and Skyline had done prior work on it). The inspector requested records for forty-seven work orders.

Of the forty-seven, forty-four were retrieved from Corridor within twenty minutes. Three required Gary to run custom queries because the aircraft's N-number had been entered inconsistently across records — one entry used "N12345," one used "12345," and one used "N-12345." All three were for the same aircraft. Corridor's search is literal; it doesn't normalize the format. Those three work orders took forty minutes to locate.

The inspector noted the retrieval delay. It was not a finding, but it was noted.

Linda changed the station's data entry procedure the next day: all N-numbers must be entered in the format "N" followed by the registration number, no hyphens, no spaces. She also added an N-number format check to her daily records review. What she could not do — because the software doesn't support it — is have Corridor automatically normalize N-number input at point of entry.

*"Software should not allow you to enter the same aircraft three different ways. That's not a human problem. That's a software problem."*

She also noted that during the inspection, the inspector asked to see the audit history on two specific records — who created them, who edited them, when. Corridor's audit log is not user-accessible. She had to call Rusada support during the inspection to extract the audit data, and it arrived as a raw CSV that she then had to explain to the inspector in non-technical terms. This is her single biggest frustration with Corridor.

*"An FAA inspector should be able to see the full history of any record, directly in the system, while sitting next to me. Not as a CSV I had to call to get."*

---

## Views on Corrections and Amendments

This is Linda's primary technical frustration with current MRO software.

Under 14 CFR 43.9 and FAA AC 43-9C, if an error is made in a maintenance record, the correct procedure is: draw a single line through the incorrect entry, write the correction adjacent to it or below it, and sign and date the correction. This is the regulatory standard. White-out and erasure are not acceptable.

In the paper world, this creates a visible, auditable trail: you can see what was wrong, you can see when it was corrected, and you can see who corrected it.

In Corridor, the current behavior is: if a technician makes an error in a maintenance record entry, the correction process involves editing the record, and the edit may or may not be logged in the audit trail (depending on which field was edited and which version of Corridor is running). From Linda's perspective, this is not equivalent to the paper correction standard. The paper standard requires that the incorrect entry remain visible. In Corridor, an edit overwrites the incorrect entry.

She has documented this concern in a memo to the certificate holder and keeps a copy in her QCM records. She cannot change Corridor's behavior. She has implemented a workaround: all corrections to maintenance records in Corridor must be done via an addendum note in the record's notes field, following the format: "CORRECTION [date] [cert]: Original entry read '[incorrect text].' Corrected entry: '[correct text].' Reason: [reason]." The original record is left intact. The addendum is the correction.

This workaround is labor-intensive and not enforced by the software — she enforces it by reviewing every corrected record personally.

---

## What She Wants From Software

1. **Full audit history viewable in the UI** — not as an export, not as a support call, not as a CSV. Any inspector should be able to sit next to her and see the complete creation/edit/correction history of any record on the same screen as the record itself. Timestamped, identified by user, immutable.

2. **Corrections as explicit actions, not edits** — Signed records must not be editable. A correction to a signed record must be created as an amendment entry: original text preserved, correction text added, reason required, signed by the correcting party, reviewed by QCM. The amendment must appear in the audit trail as a distinct entry, not as an overwrite.

3. **N-number normalization at data entry** — The system should enforce a single format for aircraft registration numbers at the point of entry, before the record is created. Not after. Not through a report. At entry.

4. **Discrepancy aging visibility** — The QCM dashboard should show every open discrepancy across all active work orders, with days-open, category (if MEL-deferred), and MEL category expiry date.

5. **Records retrieval by aircraft across any date range** — She needs to be able to pull every work order, maintenance record, AD compliance record, and discrepancy for a specific aircraft for any date range, in under five minutes, in a format that an FAA inspector can review without needing a tutorial.

6. **QCM review flag** — Every work order that has been through QC review should have a visible, audited "QC reviewed" flag with the reviewer's name, date, and any notes. Not just a status field. An event.

---

## What She Fears About Software

- **Silent data loss** — A system that appears to be working but is quietly losing records or failing to save corrections. She has seen this with Corridor in minor ways (note fields that didn't save, a status that didn't update). In a regulated environment, silent failures are worse than loud failures.
- **Audit trails that aren't actually trails** — Systems that claim to have audit logging but log only certain fields, or log in formats that aren't inspector-accessible. A log that only the vendor can read is not a log for her purposes.
- **Over-reliance on the software's judgment** — Green checkmarks that substitute for actual review. She does not want the software to tell her the records are correct. She wants the software to make it easy for her to verify that they're correct.
- **Version-dependent behavior** — Corridor's audit logging behavior changed between version 8 and version 9 in ways that were not clearly documented. She found out during the 2023 inspection. She is deeply skeptical of any system where the behavior of a core compliance feature depends on which version is running.

---

## Why She Agreed to Embed with Athelon

She was hired by Gary at Gary's request, after Gary took Rosa Eaton's call. Gary told her: "Rosa says there's a team building MRO software who actually want to understand how we work before they build it. I need you to go tell them what we actually need." She considers that her job.

She arrived at this interview having already drafted a two-page list of questions for the Athelon team. She is not a passive interview subject.

---

## Notes for Athelon Team

- Linda operates with a different vocabulary than Gary. Gary thinks in terms of workflows and airplanes. Linda thinks in terms of records, retrievability, and legal defensibility. Both are correct; they're looking at different parts of the same elephant.
- Do not conflate "audit log" with "change history." For Linda, an audit log must be: user-identified, timestamped, immutable, inspector-accessible in the UI (not just exportable), and comprehensive (every create, every amendment, every failed sign-off attempt). If Athelon's audit log meets fewer than all five, Linda will say so.
- The immutable records architecture (no `updatedAt` on `maintenanceRecords`) is exactly the right answer to her correction concern. Describe it using her vocabulary: "Signed records cannot be edited. Corrections are amendments — the original is preserved, the amendment is a new record linked to the original, and both appear in the record history."
- She will ask about what happens to records if Athelon goes out of business. Have an answer.
