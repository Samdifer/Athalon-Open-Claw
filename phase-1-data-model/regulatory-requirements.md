# Athelon — Regulatory Requirements for the Core Data Model
**Document Type:** Regulatory Requirements Specification  
**Produced by:** Marcus Webb (Regulatory/Compliance Engineer) + Capt. Rosa Eaton, Ret. (Aviation Technical Advisor)  
**Date:** Day 1, Phase 1  
**Meeting Duration:** 2 hours, 17 minutes  
**Status:** DRAFT — Pending full-team review

---

## Meeting Context

> *Marcus and Rosa met in a shared Google Meet session on the morning of Day 1. Rosa had her dog-eared copy of the FAR/AIM open on the desk next to her laptop. Marcus had eCFR pulled up on his second monitor and was working from an annotated spreadsheet he'd built at the FAA and never stopped updating. Both started with coffee. Neither took breaks.*

Marcus kicked off: *"I want to get through 43, 65, and 145 today and identify every data point the system has to capture or it's not compliant. Then we give that list to Rafael before he designs a single table."*

Rosa: *"Good. Because I can already tell you from using Corridor for six years that they got 43.9 wrong — they store the work description as free text with no structure. When an inspector asks for all maintenance performed on a specific component, you're doing a grep. And that's not how Part 43 works."*

Marcus: *"Let's start from the top."*

---

## Section 1: Maintenance Action Records — 14 CFR Part 43.9

### Regulatory Basis
**14 CFR § 43.9 — Content, form, and disposition of maintenance, preventive maintenance, rebuilding, and alteration records (except inspections performed in accordance with part 91 and part 125)**

### What the Regulation Actually Requires

Each person who maintains, performs preventive maintenance, rebuilds, or alters an aircraft, airframe, aircraft engine, propeller, appliance, or component part shall make an entry in the maintenance record of that equipment containing the following:

**(a)(1) — Description of work performed**
The record must describe the work performed with sufficient detail that a future reader can understand exactly what was done. The regulation does not define "sufficient detail" but FAA enforcement precedent and AC 43-9C both clarify this means:
- Specific component(s) affected (with part number and serial number where applicable)
- Nature of the work (inspection, repair, replacement, overhaul, alteration)
- Methods, techniques, and practices used (reference to approved data)
- Reference to the approved data source used to perform the work (e.g., AMM chapter/section, STC number, AD number)

**(a)(2) — Date the work was completed**
Not the date work began — the date it was completed. For multi-day work orders this is important: the logbook entry date is the completion date.

**(a)(3) — Name of the person performing the work**
Full legal name as it appears on the certificate. Not a username. Not an employee number.

**(a)(3) — Certificate number of the person performing the work**
FAA certificate number. For A&P mechanics: 2 letters + 6 digits format (e.g., AB123456). For repair stations signing maintenance off: the repair station certificate number.

**(a)(4) — Signature**
Original signature (wet or, under specific conditions, electronic). The regulations are specific: the person who performed the work must sign. In a Part 145 repair station, the authorized inspector or authorized individual signs to return to service — but the mechanic who performed work must also be identified in the record.

### Compliance Requirements for the Data Model

| Field | Required By | Notes |
|---|---|---|
| `description_of_work` | 43.9(a)(1) | Structured, not just free text |
| `approved_data_reference` | 43.9(a)(1) | AMM, STC, AD, 337, etc. |
| `completion_date` | 43.9(a)(2) | Date work completed, not started |
| `technician_legal_name` | 43.9(a)(3) | Must match certificate |
| `technician_certificate_number` | 43.9(a)(3) | FAA format |
| `technician_certificate_type` | 43.9(a)(3) | A&P, Repairman, IA, Repair Station |
| `signature` | 43.9(a)(4) | Electronic with audit trail |
| `return_to_service_statement` | 43.9(a) implied | "Aircraft returned to service per 14 CFR 43.9" |

### Rosa's Commentary
*"The thing most shops get wrong with 43.9 is the approved data reference. Mechanics write 'inspected and found airworthy' and leave it at that. That's not compliant. You have to reference what you used to make that determination. If you inspected a control cable you need to write down that you used the AMM Chapter 27 limits. The data model needs a field for this — not optional."*

---

## Section 2: Inspection Records — 14 CFR Part 43.11

### Regulatory Basis
**14 CFR § 43.11 — Content, form, and disposition of records for inspections conducted under parts 91 and 125**

### What the Regulation Actually Requires

14 CFR 43.11 applies specifically to **annual inspections** (§ 91.409(a)), **100-hour inspections** (§ 91.409(b)), and other inspections performed under Parts 91 and 125. These are distinct from general maintenance records under 43.9.

**(a)(1) — Aircraft make, model, and serial number**
The inspection record must identify the specific aircraft. N-number alone is insufficient. Serial number is required.

**(a)(2) — Total time in service**
Hours, cycles (if tracked), and calendar time on the airframe. Also required: total time on each engine and propeller.

**(a)(3) — Type of inspection and brief description of the extent**
Must state whether it is an annual, 100-hour, progressive, or other type.

**(a)(4) — Date of the inspection and airworthiness directive compliance**
The record must state the date, and if any ADs were found applicable, must document the AD number and compliance status.

**(a)(5) — Signature, certificate number, and certificate type**
For an annual inspection: must be signed by the IA (Inspection Authorization holder). For a 100-hour inspection: may be signed by A&P mechanic.

**(a)(6) — Airworthiness determination**
The IA or A&P must make one of two determinations:
- **Aircraft returned to service** (found airworthy)  
- **Aircraft NOT returned to service** (discrepancies listed)

If aircraft is NOT returned to service, a list of discrepancies must be provided to the aircraft owner or lessee per 43.11(b).

### Critical Distinction: 43.9 vs. 43.11

Rosa raised this explicitly: *"43.9 and 43.11 are two different record types that most systems conflate. 43.9 is the work record — what did you do. 43.11 is the inspection record — did you inspect the whole aircraft per the approved inspection program and what was the result. They coexist. An annual produces both: a 43.11 inspection record AND 43.9 records for any maintenance performed during the annual. The system needs to model them separately."*

Marcus: *"Agreed. And the 43.11 record is what gets entered in the aircraft logbook. The 43.9 records go in the maintenance record. Different documents, different retention requirements."*

### Discrepancy List Requirements

When an aircraft is found to have discrepancies and is NOT returned to service:
- Owner/operator must be given a written list of discrepancies
- This list must be signed by the IA or A&P
- The aircraft may not be returned to airworthy status until discrepancies are corrected and properly signed off

**This means the data model needs a discrepancy entity that links to both the inspection record and eventual corrective action.**

---

## Section 3: Record Retention — 14 CFR Part 145.219

### Regulatory Basis
**14 CFR § 145.219 — Recordkeeping**

### Retention Requirements by Record Type

| Record Type | Retention Period | Basis |
|---|---|---|
| Work orders | 2 years from completion | 145.219(a) |
| Maintenance records (43.9) | 2 years from completion | 43.9 + 145.219 |
| Training records | 2 years | 145.219(a) |
| Contract maintenance records | 2 years | 145.219(a) |
| Records for major repairs/alterations | **Indefinitely** on the aircraft | 43.9(c) |
| 8130-3 tags received with parts | Life of the part installation | 145.221 |
| AD compliance records | **Indefinitely** — until superseded | 91.417(a)(2)(v) |
| Annual/100-hr inspection records | **Indefinitely** on the aircraft | 91.417(a)(2)(i) |

### The Indefinite Records Problem

Marcus: *"This is where most systems fail. The 'delete after 2 years' logic that works for work orders absolutely does not work for AD compliance records or inspection records. Those follow the aircraft forever. When that aircraft sells, those records transfer. If the records are stored per-organization in the system and the aircraft moves to a different operator, what happens to the records?"*

Rosa: *"In a physical shop, those records are in a manila folder that goes in the logbook that goes with the aircraft at sale. In a SaaS system, the records belong to the aircraft, not the repair station. That's a fundamental architecture decision — and it has to be made before the schema is designed."*

**Requirement:** Records with indefinite retention (AD compliance, inspection records, major repairs) must be associated with the aircraft, not with the repair station. When an aircraft changes operators, its permanent records must be transferable.

### 145.219 Specific Requirements

- Records must be maintained in a manner that protects them from deterioration, alteration, or loss
- Records must be readily retrievable for FAA inspection
- If paper records are converted to electronic, the original paper must be retained or the electronic version must be certified as a true copy

---

## Section 4: Technician Certification Tracking — 14 CFR Part 65

### Regulatory Basis
**14 CFR Part 65, Subpart D — Mechanics**  
**14 CFR § 65.71 — Eligibility requirements**  
**14 CFR § 65.75 — Knowledge requirements**  
**14 CFR § 65.83 — Recent experience requirements**  
**14 CFR § 65.85 — Airframe rating: Additional privileges**  
**14 CFR § 65.87 — Powerplant rating: Additional privileges**  
**14 CFR § 65.91 — Inspection authorization**  
**14 CFR § 65.92 — Inspection authorization: Duration**  
**14 CFR § 65.93 — Inspection authorization: Renewal**

### What Must Be Tracked

#### A&P Certificate (Airframe and Powerplant)
- Certificate number (FAA-issued, lifetime)
- Certificate type: Airframe only, Powerplant only, or A&P (both ratings)
- Issue date
- Certificate is **permanent** — does not expire, but privileges can lapse

#### Recent Experience Requirement (65.83)
**This is the sleeper compliance issue most systems miss.**

A certificated mechanic may not exercise the privileges of their certificate unless they:
- Have, within the preceding 24 months, served as a mechanic under their certificate, OR
- Have technically supervised other mechanics, OR
- Have taken and passed a refresher course accepted by the Administrator

**Implication:** The system must track the date of last exercise of certificate privileges. A mechanic whose certificate is valid but who hasn't turned a wrench in 25 months cannot legally sign maintenance records.

#### Inspection Authorization (IA)
- IA is a separate authorization, not a certificate upgrade
- **Expires annually on March 31** regardless of when it was issued
- Must be renewed each year — lapse is common and creates compliance gaps
- Renewal requirements: 14 CFR 65.93 (must perform certain activities during the year)
- Only IAs can approve aircraft for return to service after annual inspections

#### Type Endorsements and Ratings
- Some aircraft require specific type training/authorization
- Part 145 repair stations may grant additional authorization beyond base certificate
- Repair station authorization lists must be tracked

### Certification Requirements Table

| Field | Required By | Notes |
|---|---|---|
| `certificate_number` | 65.71 | FAA format |
| `certificate_type` | 65.75 | A, P, A&P, IA, Repairman |
| `ratings` | 65.85, 65.87 | Airframe, Powerplant |
| `issue_date` | 65.71 | |
| `ia_authorization` | 65.91 | Boolean + expiry |
| `ia_expiry_date` | 65.92 | Always March 31 of a year |
| `last_exercised_date` | 65.83 | Recent experience tracking |
| `recent_experience_valid` | 65.83 | Computed: within 24 months |
| `repair_station_authorizations` | 145.155 | What this tech is authorized to do at this RSO |

---

## Section 5: Electronic Logbook Defensibility — FAA Advisory Circular 43-9C

### Regulatory Basis
**FAA Advisory Circular 43-9C — Maintenance Records**  
*(Note: This AC provides guidance, not regulation, but FAA inspectors use it as the standard for what constitutes an acceptable maintenance record)*

### What Makes an Electronic Record Legally Defensible

AC 43-9C provides that electronic records are acceptable **if** they meet the following conditions:

**1. Completeness**
The electronic record must contain all elements required by 43.9 or 43.11. A PDF that omits the certificate number is not compliant regardless of the medium.

**2. Authenticity**
The record must be traceable to the person who signed it. Electronic signatures must be:
- Unique to one person
- Capable of verification
- Linked to a record in a way that makes unauthorized alteration detectable

**3. Integrity**
The record must be protected against alteration after signing. This is the critical one. AC 43-9C does not specify a technical method, but:
- If a record can be edited after signing without detection, it is not defensible
- The FAA expects to see an audit trail showing the original record and any subsequent changes
- Hash-based integrity verification is acceptable

**4. Retrievability**
An FAA inspector must be able to retrieve all records for a specific aircraft, date range, or type of work within a reasonable time. "Reasonable" in practice means minutes, not hours.

**5. Accessibility Duration**
Records must be accessible for the retention period required (2 years for most, indefinitely for permanent records). A cloud system that could be shut down is a regulatory risk.

### The Signature Problem

Rosa: *"This is where most electronic systems fall apart. The mechanic's name typed in a field is not a signature. A checkbox that says 'I certify this work was performed' is not a signature. You need either a wet signature digitized and linked to the record, or a PKI-based electronic signature, or a platform-level authentication event that is logged and timestamped. The FAA has accepted all three of these in different contexts. But just having the technician be logged in when they submit? That's barely adequate. I've seen that challenged."*

Marcus: *"The AC says the signature must be capable of authentication and must be linked to the data in a way that makes alteration detectable. The technical implementation is our choice. But whatever we do, we need to be able to demonstrate that the record cannot be altered after signing without that alteration being visible in the audit trail."*

---

## Section 6: FAA Form 8130-3 (Airworthiness Approval Tag)

### Regulatory Basis
**14 CFR § 43.9(e)** (reference to approved parts documentation)  
**14 CFR § 145.221** (record of parts and materials used)  
**FAA Order 8130.21** (Procedures for Completion and Use of the FAA Form 8130-3)

### Required Fields on the 8130-3

The 8130-3 has 19 blocks. All must be present and correctly completed:

| Block | Field | Notes |
|---|---|---|
| 1 | Approving Authority/Country | Always "FAA / USA" for domestic |
| 2 | Applicant's Name and Address | Entity releasing the part |
| 3 | Form Tracking Number | Unique per form, for traceability |
| 4 | Organization | Repair station cert number (if applicable) |
| 5 | Work Order/Contract/Invoice | Links to work order in the system |
| 6 | Item | Line number for multi-part forms |
| 7 | Description | Part name |
| 8 | Part Number | Manufacturer's part number |
| 9 | Eligibility | Aircraft make/model the part is eligible for |
| 10 | Quantity | Number of parts |
| 11 | Serial/Batch Number | Serial for traceables, batch for expendables |
| 12 | Life-Limited Part | Yes/No, and if Yes: cycles/hours remaining |
| 13 | Status/Work | New, Overhauled, Repaired, Inspected |
| 14 | Remarks | Additional information, limitations |
| 15 | Certifying Statement | Regulatory certification language |
| 16 | Authorized Signature | Must be an authorized signatory |
| 17 | Approval/Authorization Number | Repair station cert number |
| 18 | Authorized Signature (Export) | For export; not always required |
| 19 | Export Authority Number | For export; not always required |

### Critical 8130-3 Rules

1. **Life-limited parts:** If Block 12 says "yes," the remaining life must be stated and the system must track this against the part's total life limit
2. **Traceability chain:** The 8130-3 must accompany the part from the releasing entity through installation. If the chain breaks, the part's airworthiness is questionable
3. **Form must be retained with the maintenance record:** 145.221 requires the repair station to retain records of all parts installed
4. **Counterfeit parts:** If a part is received without an 8130-3 (or with a suspect one), it must be quarantined. The system needs a quarantine state for parts

Rosa: *"Block 12 is the one that causes the most problems. Life-limited parts — think landing gear components, turbine blades, certain structural fasteners — have a total life in cycles or flight hours. When you install one, you need to know how many cycles it has left. That requires knowing the part's total life from the manufacturer, its previous usage before you got it, and then tracking usage from installation forward. Most systems I've seen don't model this correctly. They store the 8130-3 as a PDF attachment and call it done. That's not tracking. That's filing."*

---

## Section 7: AD Compliance Documentation

### Regulatory Basis
**14 CFR § 39.3 — General** (ADs are mandatory)  
**14 CFR § 91.409** (inspection requirements with AD cross-reference)  
**14 CFR § 91.417(a)(2)(v)** (indefinite retention of AD compliance records)  
**FAA Policy on Electronic AD Tracking** (various Advisory Circulars)

### What Must Be on File for AD Compliance

For each Airworthiness Directive applicable to the aircraft or its components:

| Field | Requirement | Notes |
|---|---|---|
| `ad_number` | AD identifier | Format: YYYY-NM-MM-NN (year-number) |
| `ad_title` | Brief description | |
| `effective_date` | When AD became effective | |
| `applicability` | What the AD applies to | Make/model/serial range, part number, etc. |
| `compliance_method` | How compliance was achieved | Per AD paragraphs |
| `compliance_date` | When compliance was accomplished | |
| `compliance_hours_at_time` | Aircraft total time when complied | |
| `compliance_cycles_at_time` | Cycles when complied (if applicable) | |
| `next_due_hours` | Next recurring compliance due (if recurring) | Computed |
| `next_due_date` | Calendar-based recurrence (if applicable) | Computed |
| `next_due_cycles` | Cycle-based recurrence (if applicable) | Computed |
| `maintenance_record_reference` | Link to the 43.9 record proving compliance | |
| `parts_replaced` | Parts replaced as part of compliance (with PNs) | |
| `technician` | Who performed the compliance | |
| `signatory` | Who signed the return to service | |

### One-Time vs. Recurring ADs

This is the most complex part of AD modeling:

**One-time ADs:** Accomplished once; system marks as COMPLIED, no further action required (unless superseded)

**Recurring ADs:** Must be complied with at specified intervals. Types:
- **Calendar interval:** Every 12 months, every 24 months
- **Hours interval:** Every 100 hours TT, every 500 hours SE
- **Cycles interval:** Every 200 landings, every 1000 cycles
- **Combination:** Calendar OR hours, whichever comes first

**Superseded ADs:** When a new AD supersedes an old one, compliance records for the old AD must be retained, but the new AD takes precedence.

Marcus: *"The applicability determination is the hardest part. An AD may apply to 'all Boeing 737-300 series aircraft with line numbers 1 through 1847 with engine serial numbers in the range X through Y.' Determining applicability requires matching the AD's applicability text against specific aircraft data. This is a research task, not a lookup. The system can facilitate it, but it cannot automate it without significant data work."*

Rosa: *"What the system absolutely must prevent is a return-to-service sign-off on an aircraft with an overdue AD. That's the red line. I've seen aircraft return to service with open ADs because the shop was using a spreadsheet and missed it. The consequences were not good."*

---

## Section 8: Compliant Maintenance Record — Exact Required Fields

### Summary: The Complete Compliant Record

Based on 14 CFR Part 43.9, 43.11, AC 43-9C, and FAA enforcement precedent, a legally compliant maintenance record for a general maintenance action must contain:

```
REQUIRED FIELDS — 14 CFR 43.9 COMPLIANT MAINTENANCE RECORD
─────────────────────────────────────────────────────────────
1.  Aircraft identification:
    a. N-number (registration)
    b. Make and model
    c. Serial number
    d. Total time in service (airframe hours)

2.  Component identification (if component-level work):
    a. Component name
    b. Part number
    c. Serial number
    d. Position/location on aircraft

3.  Work description:
    a. Description of work performed
    b. Reference to approved data used
    c. Parts replaced (P/N, S/N, 8130-3 reference)

4.  Dates:
    a. Date work was COMPLETED
    b. Date of return to service (if different)

5.  Personnel:
    a. Legal name of each person who performed work
    b. FAA certificate number for each person
    c. Certificate type (A&P, IA, Repairman, Repair Station)
    d. Rating(s) exercised (Airframe, Powerplant)

6.  Signature:
    a. Signature of person making the record entry
    b. Authentication evidence (electronic signature audit trail)

7.  Return to service statement:
    a. "Aircraft returned to service" or explicit list of discrepancies
    b. For return to service: statement that work was performed
       per 14 CFR Part 43 and the aircraft is approved for return
       to service

8.  Work order reference:
    a. Work order number
    b. Repair station certificate number (if Part 145)
```

---

## Section 9: Audit Trail Requirements

### What an FAA Inspector Expects

Rosa: *"I've been the one sitting across the table from an inspector. Here's what they want: they want to pull up any aircraft, see every maintenance action ever performed on it, see who performed each action, see the approved data used, and verify that the person who signed was authorized to sign on that date. They also want to know if anything has been changed after the fact."*

Marcus: *"The audit trail requirement is clear under AC 43-9C and FAA enforcement guidance: if an electronic record is amended, the original record must be preserved, the amendment must be identified as an amendment, and the reason for the amendment must be documented. You cannot overwrite a maintenance record. Ever."*

### Can Records Be Edited?

This was a 15-minute discussion. Summary:

**Short answer: Effective no. Formal answer: Only under very specific conditions.**

- A signed maintenance record is a legal document. It cannot be altered.
- If an error is discovered (wrong part number recorded, etc.), the process is:
  1. Create a correction entry referencing the original
  2. Original record is preserved unchanged
  3. Correction entry identifies: what was wrong, what is correct, who made the correction, when
- There is no "edit" operation on a signed record. There is only "correction entry."
- The system must enforce this. Not as a UI nicety. As a schema constraint.

### What the Audit Log Must Capture

| Event | What to Log |
|---|---|
| Record created | User, timestamp, IP/device, all field values |
| Record signed | User, timestamp, certificate number used, signature hash |
| Record viewed | User, timestamp (for sensitive records, per some interpretations) |
| Correction entry created | User, timestamp, original record ID, field changed, old value, new value, stated reason |
| Record exported | User, timestamp, recipient (for records sent to owner/operator) |
| Record accessed by FAA inspector | Timestamp, inspector ID if provided |

Rosa: *"The view logging is one people debate. The FAA doesn't explicitly require you to log every view. But if you're ever in litigation and someone claims they didn't see a record, and you have no view log, you're in a harder position. We should log views for any signed record."*

---

## Section 10: Things the Team Probably Hasn't Thought Of Yet

These are the 3+ issues Marcus and Rosa identified that will cause problems if not addressed in the data model now.

### 10.1 — The Work-in-Progress Problem

**Issue:** A work order may span multiple days, involve multiple technicians, and reference parts ordered mid-job. The 43.9 record is made at **completion**. But the system needs to track the work as it happens — discrepancies found, steps completed, parts ordered and received — before the final record is created.

**What most systems do wrong:** They model the logbook entry as the primary work record. This means the record doesn't exist until work is complete. But the mechanic needs to log what they're finding as they go, and the shop manager needs to see work-in-progress.

**What must happen:** The system must have a concept of a "work order" (active, tracking in-progress work) that is distinct from the "maintenance record" (the legal logbook entry, created at completion). When the work order is closed, it crystallizes into an immutable maintenance record.

**Regulatory citation:** 43.9(a)(2) — the record date is completion date, which implies the record is made at completion. But 145.157 requires repair stations to maintain progress records during work.

Marcus: *"This is the architectural key. Two different entities. Work order is mutable. Maintenance record is immutable. The transition from one to the other is the moment of signing."*

### 10.2 — Multiple Inspectors, Multiple Sign-Offs

**Issue:** On large aircraft or complex maintenance visits, different technicians may sign off different sections of the work. A 100-hour inspection may involve one technician inspecting the airframe, another inspecting the engine run-up, and the IA doing the final sign-off. All of these must be traceable.

**What most systems do wrong:** They model a single "signed by" field on the maintenance record. When you have a crew of mechanics each signing off individual items, that model collapses.

**What must happen:** The data model must support multiple signatories per work order, with each signatory linked to a specific scope of work and using their specific certificate. The final return-to-service signature (the IA's) must be explicitly modeled as a different record type from individual work sign-offs.

**Regulatory citation:** 43.9(a)(3) — the person making the record entry must sign. For crew work, each person must sign their own work. 43.11(a)(5) — the IA signs the inspection record. These are separate signatures.

Rosa: *"In my shop, the A&P guys would each sign off the items they did on the task card. Then the IA signs the 43.11 annual entry. You need all of those in the system. Just storing the IA's signature and losing the mechanic-level sign-offs is a compliance gap."*

### 10.3 — The Owner-Provided Parts Problem

**Issue:** 14 CFR 145.201(c) prohibits a repair station from returning an article to service if the owner has provided parts that do not meet airworthiness standards. But owners routinely bring parts with them, and some of those parts are legally installable.

**What most systems don't model:** The distinction between:
- **Parts supplied by the repair station** (tracked through Parts Inventory)
- **Owner-supplied parts (OSP)** with an 8130-3 from an approved source
- **Owner-supplied parts without documentation** (must be inspected and dispositioned)
- **Suspected Unapproved Parts (SUP)** which must be quarantined and reported to the FAA

**What must happen:** The data model must track part provenance separately from part identity. A part number and serial number tell you what the part is. The provenance record tells you whether it's airworthy.

**Regulatory citation:** 14 CFR 145.201(c) — parts used must meet airworthiness requirements. FAA Order 8120.11 (Suspected Unapproved Parts reporting requirements).

Rosa: *"This one will come up in the first month of beta. A customer will show up with a part from eBay in a Ziploc bag and want you to install it. The system needs a workflow for that. And it needs to prevent that part from being marked as installed until it's been inspected and either accepted or rejected."*

### 10.4 — Deferred Maintenance Items and MEL

**Issue:** Aircraft operating under a Minimum Equipment List (MEL) may defer certain maintenance items while remaining airworthy for continued operation. The MEL deferral is itself a record that must be maintained.

**What most systems don't model:** MEL deferrals as a distinct record type. Instead, they either mark the discrepancy as "open" (which implies the aircraft isn't airworthy) or incorrectly close it (which creates a false compliance record).

**What must happen:** Discrepancies must have a disposition type that includes:
- **Corrected** (normal case)
- **Deferred per MEL** (item deferred, aircraft remains airworthy within MEL limitations)
- **Deferred — Aircraft Out of Service** (item not corrected, aircraft must be grounded)
- **Deferred per NEF/CDL** (No Effect Failure / Configuration Deviation List — Part 121/135 specific)

**Regulatory citation:** 14 CFR 91.213 — use of MEL. Part 121 Appendix B (MEL framework for air carriers). MMEL Policy Letters.

Marcus: *"Part 91 operators use MELs more than most people think. And if we're building this for Part 145 shops that serve 135 operators, we will absolutely have customers who need MEL tracking."*

### 10.5 — The Multi-Standard Problem

**Issue:** The same aircraft may be subject to different regulatory standards depending on what kind of operations it's used for:
- Part 91 (private)
- Part 135 (charter)
- Part 121 (airline — less likely for MRO software, but possible)
- Part 137 (agricultural)

The maintenance requirements, record-keeping requirements, and inspection intervals differ significantly between these parts. An aircraft transitioning from Part 91 to Part 135 operations must undergo an AAIP (Aircraft Airworthiness Inspection Program) and the maintenance records requirements change.

**Regulatory citation:** 14 CFR Part 135.411 — Part 135 maintenance requirements. 14 CFR Part 135.421 — additional maintenance requirements.

Rosa: *"This one is a sleeper. A customer will have a fleet where some aircraft are Part 91 and some are Part 135. The system needs to know which standard applies to which aircraft. The maintenance record requirements are different. The inspection intervals are different. The AD compliance tracking may be different. You cannot use one template for all of them."*

---

## Summary Checklist for the Data Model

Marcus produced this at the end of the meeting as the "you must have this or you are not compliant" list:

### Non-Negotiable Schema Requirements

- [ ] Maintenance records are **immutable once signed**. No edit operations. Corrections are new records.
- [ ] Every maintenance record links to a **specific technician** with a **certificate number** and **certificate type**.
- [ ] Every maintenance record contains an **approved data reference** (not optional).
- [ ] Aircraft are identified by **serial number + make/model**, not just N-number.
- [ ] Permanent records (AD compliance, annual inspections, major repairs) are **associated with the aircraft**, not the repair station.
- [ ] AD records track **compliance intervals** and can compute next-due based on hours, cycles, or calendar.
- [ ] Parts have a **provenance chain** from 8130-3 through installation.
- [ ] Life-limited parts track **remaining life** in hours and/or cycles, not just total-time.
- [ ] Technician records track **IA expiry** (always March 31) and **recent experience validity** (24-month rule).
- [ ] Discrepancies have structured **disposition types** including MEL deferral.
- [ ] Work orders are **mutable**; maintenance records are **immutable**. Different entities.
- [ ] The audit log captures every write event with user identity, timestamp, and old/new values.
- [ ] The system supports **multiple signatories** per work order scope.
- [ ] 8130-3 data is **structured fields**, not PDF attachments only.

---

## Open Questions Requiring Engineering Decision

1. **Electronic signature standard:** What specific electronic signature mechanism will we use? Options: PKI certificates, platform-attested authentication event + hash, integration with DocuSign or similar. Must be defensible under AC 43-9C.

2. **Aircraft record portability:** When an aircraft leaves a customer's organization (is sold, transferred), what happens to its records in Athelon? Can the new operator access them? This is a legal records question as much as a product question.

3. **FAA DRS integration:** Will Athelon integrate with the FAA's DRS (Document Retrieval Service) for automatic AD retrieval? This is not required but dramatically reduces manual AD tracking burden.

4. **ASAP data source:** AD applicability determination requires aircraft-specific data (line numbers, TSN/CSN, mod status). Where does this data come from? Manual entry? Aircraft registry integration?

5. **Multi-standard records:** How does the system handle an aircraft that operates under multiple parts simultaneously (e.g., owned under Part 91, intermittently chartered under Part 135)?

---

*Document prepared by Marcus Webb and Capt. Rosa Eaton.*  
*Meeting notes and technical details captured by Marcus Webb.*  
*Rosa Eaton endorses all regulatory interpretations in this document.*

**Sign-off required before data model design begins:** ✅ Marcus Webb ✅ Rosa Eaton
