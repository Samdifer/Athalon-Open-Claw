# Erik Holmberg — Lead A&P Mechanic (Powerplant Focus)
**Role:** Lead A&P Mechanic — Powerplant Specialist  
**Embedded with:** Athelon Engineering Team, Phase 5 Repair Station Integration  
**Date profiled:** 2026-02-22

---

## At a Glance

| | |
|---|---|
| **Certificate** | A&P — Airframe & Powerplant (both ratings) |
| **Primary focus** | Powerplant — turbine overhaul, LLP tracking, engine-run compliance |
| **Experience** | 20 years post-certificate; 7 years at a dedicated engine overhaul facility before moving to a Part 145 line shop |
| **Engine specialty** | Pratt & Whitney PT6A family (PT6A-20, -27, -34, -42, -61); JT15D-5 (Citation I/II/S/II+); Williams FJ44-1/3/4 (Citation CJ series) |
| **Current employer** | TriState Aviation Services, Wichita, KS (Part 145, turbine-rated, engine shop and line maintenance) |
| **Certificate number** | 3711048 |
| **IA held?** | No — "I work on what I know and sign what I've touched. I'll leave the IA for Sandra." |
| **Preferred tool for LLP tracking** | Spreadsheet he built himself. He knows this is a problem. |

---

## Background

Erik grew up in Duluth, Minnesota, which he will tell you explains his tolerance for cold hangar floors and his general distrust of anything that can't survive a drop onto concrete. He got into aviation because his uncle flew crop dusters and the smell of turbine exhaust at age 12 was, in his words, "the only thing that ever made sense." He went to aviation maintenance school in Oshkosh and spent the first seven years of his career inside a dedicated turbine overhaul shop — not line maintenance, not a Part 145 repair station, but a teardown-and-rebuild-from-scratch overhaul facility. He built PT6s from cases. He knows what the inside of a PT6 compressor looks like the way most mechanics know their own kitchens.

That background means Erik thinks about engines differently from line mechanics. He does not think of a PT6A-34 as an engine — he thinks of it as a collection of individual components, each with a life, each with a traceability chain back to a specific manufacturer batch, each with a signature from a specific inspector. When an engine comes in for a 3,000-hour hot section, Erik can tell you within about five minutes which components are approaching their LLP limits and which will need to go off to the manufacturer for disposition. He doesn't need the system to tell him. The problem is that the next guy does.

He moved to TriState seven years ago because the overhaul shop closed and TriState offered a lead mechanic role. He misses the teardown work. He doesn't miss the paperwork, which was voluminous. What he does miss — and what drives his requirements for Athelon — is the discipline. In overhaul work, every part has an 8130-3. Every LLP has a trace. You don't install a component without paper in your hand. Line maintenance is sloppier about this, and Erik has been trying to fix it at TriState for seven years with limited success.

---

## The Part Record Error He Caught

Erik will bring this up without being asked. It is the founding incident of his entire philosophy about parts traceability software.

In 2019, a PT6A-42 came through TriState for a compressor section inspection. During his pre-work review of the engine records, Erik noticed a discrepancy in the LLP tracking spreadsheet (TriState's, not his) for the compressor turbine disk. The spreadsheet showed 6,240 cycles remaining on a component with an 18,000-cycle limit, implying 11,760 cycles consumed. The accompanying work orders showed 11,340 cycles of documented work. The delta was 420 cycles — roughly 140 flight hours' worth — that was unaccounted for.

Erik flagged it. It took three weeks to resolve through the owner's records, two calls to the previous MRO shop, and one call to the manufacturer. The conclusion was that a work order from 2014 had been entered incorrectly in the previous shop's system, attributing fewer cycles to the disk than were actually accumulated. The disk had 420 more cycles on it than the record showed. Had Erik not caught it, that disk would have flown to its limit and potentially 420 cycles past it.

Nobody got in trouble. The error was honest. But Erik does not describe it as a near-miss — he describes it as a proof of concept: *the software will lie to you if the humans feeding it are wrong, and you cannot assume the humans are right.*

He tells this story in the first fifteen minutes of any conversation about parts traceability. It is his thesis statement.

---

## 8130-3 Philosophy

For Erik, an 8130-3 is not paperwork. It is proof of an airworthiness determination by an authorized person, and it is the single document that links a part in the shop to its entire manufacturing and maintenance history. When he installs a component, he wants the 8130-3 visible in the software at the moment of installation — not attached somewhere in a folder, not linked as a PDF somewhere, but presented as structured data fields: part number, serial number, description, approved for return to service by whom, date, revision status.

He doesn't care if the system also stores a scanned PDF. He wants the structured data because he wants to search it. He has found parts errors in two other cases by querying traceability records — once by cross-referencing part numbers across multiple work orders and finding a component that appeared to have been in two places at once.

---

## Current Tools and Their Failures

His LLP tracking spreadsheet has 847 rows. It has survived four Microsoft Office upgrades, two shop IT transitions, and one ransomware scare during which TriState's operations manager told Erik they might have to restore from backup. Erik looked the operations manager in the eye and said: "If that spreadsheet is gone, this shop cannot legally track four of the engines currently in the building." The ransomware turned out to be isolated to the accounting machine. But Erik's spreadsheet now has two backups on separate USB drives.

He would very much like to not be the single point of failure for his shop's LLP tracking.

---

## Personality & Interview Notes

Large, deliberate, speaks slowly with the kind of precision you get from someone who learned early that imprecision in engine overhaul work has consequences. Does not use filler words. When he's done making a point, he stops talking. He is not unkind, but he is direct, and he will ask for clarification if a question is ambiguous rather than guessing at your intent.

He prepared for this interview. He has a pocket notebook with four handwritten bullet points. This is unusual and suggests he has been waiting for this conversation.

---

## Known Requirements He Will Surface in Interview

- 8130-3 data as structured fields at install time, not just PDF attachment
- LLP tracking visible and queryable per engine serial number, not buried in parts history
- Cycle/hour accumulation must be enforced at the data model level — no entering fewer cycles than the previous entry
- Part traceability must support cross-referencing: same S/N appearing on multiple work orders must be detectable as a data error
- Incoming parts receipt must require 8130-3 documentation before the part can be moved to "available" status
- Overhaul history visible per component, not per work order — the component has a life that spans multiple shops
