# Technician Profile — Felix Okafor
**Specialty:** Sheet Metal / Structural Repair  
**Role:** Senior A&P Mechanic — Structural Repair Specialist  
**Organization:** Desert Raptor Aviation (Henderson, NV) — Part 145 Repair Station  
**Interview Date:** 2026-02-22  
**Interviewed By:** Nadia Solis (PM), Marcus Webb (Compliance) observing

---

## Certification & Credentials

- **14 CFR Part 65:** Full A&P certificate (Airframe and Powerplant)
- **Inspection Authorization:** IA — current, held since 2018
- **Structural Repair Expertise:** Primary SRM experience with Cessna 172 series (2150–2212 AD series), Piper PA-28/PA-44 series, Beechcraft Bonanza (V35/A36), King Air 200/350 (B200), and Cessna Citation CJ1/CJ2 (limited, under DER supervision)
- **DER Relationship:** Works regularly with Bob Hwang, DER (Designated Engineering Representative), FAA-authorized for metallic structure on small aircraft; formal consulting relationship established 2019
- **Training:** Cessna Structural Repair Training (2011, Wichita); Piper Service Center training (2013); EAA SportAir Structural Repair workshop (2017); FAA AMT Award for Excellence, 2020
- **Years of Experience:** 19 years total; 13 in structural repair focus; 6 at current repair station

---

## Background

Felix Okafor was born in Lagos and came to the US with his family at age nine. He grew up in South Phoenix, discovered EAA Chapter 724 at age seventeen (a neighbor was restoring a Stinson 108), and had his A&P certificate three months after his twenty-first birthday. He spent four years at a sheet metal shop in Phoenix doing mostly Bonanza and Baron structural work before moving to Desert Raptor, where the presence of King Air and light jet traffic gave him more complex structural work than he'd seen before.

He is a careful, thorough writer of maintenance records — a quality that is rarer in his specialty than it should be. He believes the maintenance record for a structural repair is a legal document that needs to tell the complete story: what damage was found, how it was measured, what reference was used to determine if it was within limits or required repair, what repair method was applied, and what the final condition of the repaired structure is. He does not accept shorthand. He has marked up another tech's work order three times in the last two years because the damage description was inadequate.

He also has specific aesthetic frustrations: he finds the physical format of most maintenance record text fields — narrow, word-wrap-heavy, no line breaks in the rendered output — makes his carefully structured records unreadable. He has started writing his structural repair narratives in a Word document first, then copy-pasting into EBIS 5. He loses the formatting every time. This infuriates him in a quiet, professional way.

---

## Work Pattern

Felix's structural repair work comes in several types:

**Type 1 — In-Limits Damage (SRM reference):** Aircraft arrives with a dent, scratch, or corrosion finding. Felix inspects, measures, references the applicable SRM, determines the damage is within allowable limits per the chart (or isn't, and proceeds to repair). Logs the finding and the disposition — in-limits or repair required — with the SRM chapter/section reference. This is the most common case.

**Type 2 — Repair Per SRM:** Damage exceeds in-limits but the repair is covered by the SRM. Felix designs the repair using the SRM methodology — rivet pattern, doubler sizing, material specification. Logs the repair with the complete SRM reference: manual title, revision level, chapter, section, subject, and figure number.

**Type 3 — Engineering Order (EO) or DER Approval:** Damage exceeds what the SRM covers, or the repair location is in a primary structure area requiring specific engineering sign-off. Felix writes up the damage, contacts Bob Hwang (DER), provides measurements and photos. Bob issues an Engineering Order or approves a repair design. Felix performs the repair, logs it with the EO or DER approval number, and Bob co-signs the return-to-service documentation.

**Type 4 — Major Repair (FAA Form 337):** A subset of Type 3 where the repair constitutes a major repair under Part 43, Appendix A, and requires FAA Form 337 to be submitted to the Oklahoma City Aircraft Registry. Felix has completed 11 Form 337s in his career. He knows the form. He is very specific about what goes in Box 8 (description of work accomplished).

---

## Specific Pain Points with Current Software (EBIS 5)

### 1. SRM References Are Freeform Text — No Structure
The most important piece of information in a structural repair record is the SRM reference: Manual title, revision level, chapter, section, subject (CSS format). Example:

> *Cessna 172 Structural Repair Manual, Revision 4, Chapter 53 — Fuselage, Section 10 — Fuselage Structure, Subject 10 — Allowable Damage — Table 53-10-10-1.*

In EBIS 5, this goes in a text field. There is no structure. A new tech logs it as "Cessna SRM Ch 53." An experienced tech logs the full reference. An inspector comparing the two records gets wildly different information. There's no standardization, no enforcement, and no way to search by SRM chapter across work orders.

### 2. Damage Description Has No Standardized Format
Felix's internal standard for damage description is: *Location (station/stringer/rib reference), Type (dent/crack/corrosion/abrasion), Dimensions (length × width × depth), Extent (isolated/multiple areas), Proximity to structure (distance to nearest fastener/seam/edge).* EBIS 5 offers one text field. The damage description field and the repair description field are the same field. Felix separates them with a blank line and a header. In the rendered record, it's a wall of text.

### 3. DER Reference Has No Dedicated Field
When Bob Hwang issues an EO or provides a one-time engineering disposition on a repair, that document has a number. The number — and the DER's FAA authorization number — should be in the maintenance record. EBIS 5 has no field for DER reference numbers, Engineering Order numbers, or DER identification numbers. Felix writes them in the "work performed" field. The information is there if you read carefully. It's not retrievable by search.

### 4. FAA Form 337 Is Disconnected from the Work Order
When a major repair requires a Form 337, the form is submitted to Oklahoma City via mail (or increasingly, electronic submission). Desert Raptor keeps a copy. The work order that generated the 337 should reference the 337 number, and the 337 should reference the work order number. In EBIS 5, there's no field to link the two. Felix writes "See attached 337 — WO#XXXXX" on the paper 337 and "337 submitted — see file" in the work order. The linkage exists on paper. It does not exist in the software.

### 5. Repair Records Don't Describe the Repair Methodology Adequately
This is Felix's largest frustration, and the one he cares most deeply about. A structural repair record, in his view, must answer: what method was used? What materials? What fasteners? What rivet pattern? What doubler dimensions? What final edge distances? These are the elements that would allow another engineer — or an inspector, or a future mechanic at a different shop — to verify the repair is correct and repeatable.

He's seen repair records from other shops — both at Desert Raptor on incoming aircraft and at previous jobs — that say "repaired per SRM" with no further detail. Under Part 43.9, a maintenance record must contain a description of the work performed. "Repaired per SRM" is not a description. It is a reference without content. Felix considers it non-compliant. He makes his records longer than anyone else's in the shop. He doesn't apologize for it.

---

## Opinions on Aviation Software

**On repair record format:**
> "A structural repair record should read like a technical document, not a sticky note. If another engineer has to certify this repair twenty years from now because the aircraft is going through a major overhaul, they need to be able to read my record and know exactly what I did. 'Repaired per SRM' gives them nothing. Give me a format. Give me sections. Give me fields that prompt for the right information."

**On DER relationships and documentation:**
> "Working with a DER is a collaborative process. Bob and I go back and forth on repair designs sometimes. That back-and-forth — the measurements I sent, the approval he gave, the specific conditions he attached to his disposition — is part of the record. Right now it lives in my email. Email is not a maintenance record. The software should give me a way to attach that history to the work order."

**On the 337 process:**
> "The 337 is a federal document that becomes part of the aircraft's permanent record. If my work order software doesn't know a 337 exists for a job, and someone three years later is trying to piece together why the fuselage has a doubler in that location, they're going to have to call Oklahoma City. I should be able to pull up the work order and see: 337 submitted, date, form number. Two seconds, not a phone call."

**On the value of searchable records:**
> "I want to be able to search my previous work orders by SRM chapter. If I've done a fuselage skin repair before, I want to find every previous job where I referenced Chapter 53 of that SRM. Not because I don't remember how to do it — because the previous job might have details or measurements I can compare. Right now I search by memory. That's fine when you have a good memory. It doesn't scale."

---

## Notes for the Team

- Felix represents the highest-documentation-quality technician profile we've encountered in the simulation. His requirements will push the maintenance record schema and UI to be more structured than currently specified.
- His DER relationship (Bob Hwang) is a workflow participant who is outside the Athelon organization — an external approver. This introduces the question of whether DER references in Athelon are simply stored fields (simpler) or whether DERs could eventually be external users who review and approve within the platform (complex, future scope).
- His Form 337 requirement (linkage between work order and submitted regulatory document) is not in current scope but should be noted for the compliance roadmap.
- He will be a strong advocate for structured repair record fields over free-text fields. This has UX implications (more form complexity on the maintenance record entry screen) that need to be balanced against the simpler users in the persona set.
- He's never had an FAA surveillance inspection find a problem with his records. He is aware that not all techs can say this. He considers it a professional credential.
