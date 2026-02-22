# Technician Profile — Rosario "Rosie" Tafoya
**Specialty:** Powerplant / Turbine Engine  
**Role:** Engine Specialist, Senior A&P Mechanic  
**Organization:** Desert Raptor Aviation (Henderson, NV) — Part 145 Repair Station  
**Interview Date:** 2026-02-22  
**Interviewed By:** Nadia Solis (PM), Marcus Webb (Compliance) observing

---

## Certification & Credentials

- **14 CFR Part 65:** Full A&P (Airframe and Powerplant) certificate
- **IA Authorization:** Inspection Authorization — current, renewed annually March 31
- **Engine Ratings on Repair Station Certificate:** PT6A series (Pratt & Whitney Canada), TSIO-550 / TSIOF-550 series (Continental), IO-520 / IO-550 series (Lycoming), TFE731-2/-3/-4/-5 (Honeywell)
- **OEM Training:** Pratt & Whitney Canada PT6A Maintenance Course (2015, Calgary); Honeywell TFE731 Line Maintenance Course (2018)
- **Experience:** 21 years total; 14 focused on turbine engines; 7 at current repair station; previously 5 years at an FAA-certificated turbine engine overhaul facility (ATP, Inc., Mojave, CA)

---

## Background

Rosario Tafoya grew up in Tucson. Her uncle flew charter in a twin Cessna 340 and let her sit in the right seat from the time she was twelve. She found the engines more interesting than the flying. She completed Cochise College's A&P program in 2005, got her certificate in 2006, and went immediately to line maintenance at a small turboprop charter operator in New Mexico. She transitioned to the engine shop at ATP in Mojave in 2011, where she spent five years doing teardowns, hot section inspections, and overhauls on PT6As. She can quote the PT6A-34 maintenance manual from memory on topics that matter to her.

She joined Desert Raptor in 2019, bringing a level of turbine engine expertise that is unusual in a shop that is primarily GA. She's the reason Desert Raptor carries the PT6A rating on their certificate. Without her, they'd send turboprop work to Phoenix.

She's direct, data-driven, and constitutionally unable to let a part number discrepancy pass without resolution. She has a reputation among parts vendors for being "that tech who reads the 8130-3 all the way through." Most techs scan it. Rosie reads it. Twice.

---

## Specific Domain Knowledge

### Life-Limited Parts (LLPs) — Turbine Engines

Rosie's understanding of LLP tracking is detailed and specific. She routinely deals with:

- **PT6A power turbine disk limits:** 3,500 cycles for the Ist stage turbine disk (varies by dash number; she knows each variant)
- **TFE731 compressor rotor limits:** Hour-based with a cycle correlation factor — more complex than simple cycle counting
- **Inter-stage air seal limits:** Often cycle-limited by a different interval than the rotor they surround
- **Propeller shaft bearing cartridges:** Life-limited on calendar plus cycle; the AND of two limits applies

Her concern with software is always the same: the LLP tracking has to know the accumulated life *coming in* from the last shop's records. An engine that arrives at Desert Raptor from another facility has a history. That history is in a stack of work orders, shop cards, and 8130-3s from previous operators. Entering that history correctly — and trusting that the software stores and applies it correctly — is the difference between a correctly life-tracked engine and a safety hazard.

### Suspect Unapproved Parts (SUP) — Direct Experience

In 2022, Rosie received a PT6A-34 first-stage power turbine nozzle from a parts vendor she had used twice before. The part arrived with an 8130-3 that appeared normal at first glance. On receipt inspection, she noticed two things: the Block 12 (life remaining) showed 100% remaining life, and the Block 13 (status/work) was "overhauled" — an overhauled turbine nozzle should have accumulated life, not 100% remaining. She also noticed the approval number in Block 17 referred to a repair station that she knew had surrendered its certificate in 2020.

She quarantined the part. She contacted the FAA's Flight Standards District Office. The part turned out to be from a batch of counterfeit nozzles documented in a FSDO alert. The vendor's source was traced to a non-certificated parts broker in Taipei. Rosie's shop filed a SUP report per FAA Order 8120.11. The case was referred to the FAA's Suspected Unapproved Parts Program.

She has told this story in four different contexts since. It is not a warning she gives casually. She gives it precisely, with the specific details she noticed on the 8130-3, because she wants other techs to know what to look for. The discrepancies were subtle. Most techs would have missed them.

### P/N and S/N Tracking Requirements

On life-limited parts, Rosie's position is absolute: part number and serial number are both required on every record, every time. A part number without a serial number is not a traceable record for a life-limited part. Period. She's seen work orders at other shops where LLPs were entered by description only — "turbine disk, first stage" — with no P/N and no S/N. She considers this negligent.

She also tracks serial numbers across install and remove cycles manually, maintaining a personal log of every LLP she's worked on in a spiral notebook she's carried since 2014. When a part comes in from another shop, she reads their records and compares. She's caught mismatches three times. Once the mismatch was a data entry error. Twice she didn't find out what caused it.

---

## Current Software Pain Points (EBIS 5)

### 1. No LLP Life Tracking Against an Engine Module
EBIS 5 tracks parts on aircraft. It doesn't model an engine as a separate tracked entity with its own accumulated hours and cycles. A PT6A engine has a separate log. The engine's total time and cycles are tracked separately from the airframe. When an engine is pulled and sent to the shop, its accumulated life — especially its LLP status — goes with it. EBIS 5 requires her to track this separately, in the engine logbook, and then manually reconcile.

### 2. P/N and S/N Are Not Enforced on Life-Limited Parts
EBIS 5 allows her to create a part record without a serial number. Nothing enforces that LLPs carry an S/N. She has caught techs entering LLPs into EBIS 5 without S/Ns. When she asks why, the answer is always "there was no S/N on the part when it arrived." Which is itself a red flag that should have been caught at receiving.

### 3. Suspect Part Workflow Is Manual
When she quarantines a suspect part in EBIS 5, she creates a "quarantine" note in the work order comments and physically segregates the part. There's no quarantine flag in the software. No audit trail specific to the suspect designation. No notification to the DOM. No SUP report generation. All of that is manual, on paper, and dependent on her memory.

### 4. Life Accumulation Doesn't Survive an Install-Remove Cycle Correctly
EBIS 5 has a basic parts tracking module. In her experience, if a part is removed from one aircraft and installed on another, the accumulated hours are not automatically carried forward. The tech has to manually update the hours field. Techs don't. She knows this. It's the one software behavior that keeps her up at night.

---

## Opinions on Aviation Software

**On LLP tracking:**
> "Life-limited parts are the most dangerous category of documentation failure in the business. Not because they're rare — because they're common and people get lazy about them. You put a turbine disk in with 2,800 hours on it, you're supposed to remove it at 3,500. If the software doesn't track those 700 remaining hours and alert you when they're burning down, somebody is going to let that disk keep flying. That disk will eventually fail. It's physics."

**On the SUP incident:**
> "I found it because I was paying attention. I was paying attention because I was trained to pay attention. I was trained to pay attention because I worked in an engine shop where the culture was: every document is wrong until you prove it's right. Most techs come from shops where the culture is the opposite. Software can't replace that culture. But it can catch the things a distracted tech misses."

**On electronic records vs. paper:**
> "I like electronic records for one specific reason: you can't lose them. Paper engine logbooks get lost. Water damaged. Accidentally discarded. I've received engines where the logbook is held together with a rubber band and three of the pages are illegible. If that logbook is the only record of an LLP's accumulated life, you've got a problem. Electronic records with backups don't have that problem."

---

## Notes for the Team

- Rosie's buy-in is essential for the turbine-capable shops that Athelon will eventually target. She represents the most technically demanding use case for parts traceability.
- Her SUP experience is directly relevant to the `isSuspect` flag and `suspectStatus` workflow in Phase 2's parts specification. She should review that workflow during pilot.
- She is a potential champion for Athelon's LLP tracking features if they are implemented correctly — and a severe critic if they are not.
- She and Carlos Vega (parts manager) have an established working relationship that involves Rosie doing a second review of every 8130-3 Carlos receives for turbine components. Any parts receiving workflow in Athelon needs to support this dual-review pattern.
- She maintains her own physical spiral notebook as a personal LLP log. She will not stop doing this because "software goes down." Athelon needs to earn her trust gradually, not demand it at go-live.
