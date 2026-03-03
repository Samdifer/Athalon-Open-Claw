# WS34-A — HPAC First Work Order Close: WO-HPAC-001 (N3382P Right Magneto)
**Workstream:** WS34-A
**Phase:** 34 / v1.5
**Open Item:** OI-33-03
**Work Order:** WO-HPAC-001
**Aircraft:** N3382P — Cessna 421C Golden Eagle, Continental GTSIO-520-L engine (right)
**Work scope:** Right magneto service (replacement at service interval limit)
**Performing technician:** Lorena Vásquez (DOM/IA, IA-CO-7745)
**Assisting:** Raul Montoya (A&P, HPAC)
**Observing:** Derek Sousa (co-owner, HPAC)
**Remote support:** Nadia Solis (platform support, on standby)
**Timeline:** 2026-08-21 through 2026-09-02
**Status:** ✅ DONE — WO-HPAC-001 CLOSED; N3382P RTS; OI-33-03 CLOSED

---

## §1. Background: How OI-33-03 Was Generated

### §1.1 Day 1 Data Entry (2026-07-28)

When Lorena Vásquez sat down with the shop iPad on Day 1 of HPAC's Athelon onboarding — 2026-07-28, a Monday, with the Pueblo City–County airport noise ordinance keeping the ramp quiet until 7 a.m. — she said she wanted to enter the piston fleet herself. Marcus had offered to build the boards from a data sheet Lorena could email over. She declined.

*"I need to see what the system does when I enter wrong data,"* she told Marcus during the pre-onboarding gap brief. *"I need to trust it the right way. Not because you entered everything correctly."*

That disposition — testing the platform by testing herself against it — is what led to the magneto finding before the first morning was finished.

N3382P is a 1978 Cessna 421C Golden Eagle. HPAC operates it primarily for charter pax transport under the Part 135 certificate, with Lorena sometimes flying it herself. The right engine carries a Slick 6364 magneto (OEM equivalent for the Continental GTSIO-520-L) with a TBO-based service interval of 500 hours or TBO-coincident service, per Continental GTSIO-520-L Overhaul Manual §74-00-00 and Slick Magneto Service & Overhaul Manual. The shop's logbook showed the last magneto service on the right engine was performed at 3,211.4 hours total time. At the time of Day 1 data entry, N3382P showed 3,501.3 hours total time.

The difference: 289.9 hours. Ten hours to the 500-hour service interval.

Lorena looked at the number for a moment. Then she looked at the Athelon screen. The ALS item was already amber — the platform had computed the interval, found 10 cycles remaining, and flagged it DUE_SOON without being asked. She put the iPad on the workbench and went to the logbook to verify manually. The logbook confirmed it.

She came back to the iPad. Opened a work order. Named it WO-HPAC-001.

In the notes field she typed: *"Right magneto service due. Continental GTSIO-520-L, N3382P. 3501.3 TT at entry. Last magneto service 3211.4 TT. Interval 500 hr — 10 hr remaining at entry date. Repair per Slick Magneto S&O Manual. Lorena V."*

Then she opened the platform for the first time to a WO she'd created herself, and thought: *I'm going to close this one before the end of the week.*

### §1.2 OI-33-03 — Formal Item Registration

At the close of Day 1 data entry, Marcus Webb opened OI-33-03 to track WO-HPAC-001 into Phase 34:

**OI Reference:** OI-33-03
**Opened:** 2026-07-28
**Aircraft:** N3382P (Cessna 421C, HPAC, KPUB)
**Engine:** Right, Continental GTSIO-520-L
**Component:** Slick 6364 Magneto (right), service interval 500 hr
**TT at entry:** 3,501.3 hr
**Last service:** 3,211.4 hr TT
**Remaining at entry:** 10.1 hr
**Status at entry:** DUE_SOON (CRITICAL — within 2% of interval)
**Action required:** Magneto service per Slick Magneto S&O Manual and Continental GTSIO-520-L Overhaul Manual §74-00-00
**Performing:** Lorena Vásquez (DOM/IA, IA-CO-7745); Raul Montoya (A&P, assisting)
**WO:** WO-HPAC-001

The item entered Phase 34 already in progress. N3382P was grounded pending service.

---

## §2. Pre-Work Planning (2026-08-21 through 2026-08-25)

### §2.1 Parts Assessment

When Phase 34 opened (2026-08-21), WO-HPAC-001 was still technically IN PROGRESS — Lorena had opened it in July but had been occupied with the King Air B200 ALS activation through August 8 and the subsequent Athelon training sessions. The actual bench work had not started yet. N3382P was grounded, awaiting the magneto service.

Raul Montoya pulled the bench inventory on 2026-08-21. Two options:

**Option A — Overhaul the existing magneto in-shop:** HPAC has a magneto bench test capability. Raul is qualified for magneto overhaul under the HPAC repair station capabilities list. This is the lower-cost option but adds approximately two days of bench time.

**Option B — Exchange for a serviceable overhauled magneto:** Slick Magneto Exchange unit available from Western Aircraft (Boise ID) and Aircraft Spruce (Corona CA). Exchange price ~$340 plus core. Lead time from Western Aircraft: 2 business days.

Lorena reviewed the options with Raul on the morning of 2026-08-21. They agreed on Option B — the exchange unit — primarily because N3382P had a charter booking the following Tuesday (2026-09-01) and they wanted the aircraft back in service by Friday (2026-08-28).

**Exchange unit ordered:** 2026-08-21, from Western Aircraft Supply (Boise ID). Slick 6364 exchange. P/N 06-164162-1. S/N WAS-EX-40417. Accompanying 8130-3 confirmed available. PO-HPAC-001-A issued.

Part arrived: 2026-08-25, 14:20 local. Raul received it, inspected the 8130-3, confirmed overhaul date (2026-07-03, 0 SMOH), verified the P/N match. Part entered into Athelon parts receiving. 8130-3 uploaded to WO-HPAC-001 documents.

Lorena reviewed the documentation herself that afternoon. *"Zero SMOH — good. Slick facility. 8130-3 clean."* She logged it in the WO notes and set the work start for 2026-08-26.

### §2.2 Approved Data References Confirmed

Before work began, Lorena documented the approved data references in WO-HPAC-001:
- Continental GTSIO-520-L Overhaul Manual, §74-00-00 (Ignition System)
- Slick Magneto Service and Overhaul Manual, P/N 06-10977 (current revision)
- N3382P aircraft logbook (for TT confirmation)
- FAA AC 43.13-1B, Chapter 11 (ignition system work, supplemental reference)

These references were logged in Athelon's approved data reference field for WO-HPAC-001 prior to work commencement — a pre-close checklist requirement Lorena had noted during the onboarding training with Nadia.

---

## §3. Magneto Service Execution (2026-08-26 through 2026-08-27)

### §3.1 Work Sequence

**2026-08-26, 07:45 KPUB local**

Lorena Vásquez and Raul Montoya worked the job together. Raul had done dozens of GTSIO-520-L magneto services over his twelve years at HPAC. He knew the engine cold — he'd worked on N3382P's left engine the previous spring and remembered the torque spec on the ignition harness leads from memory. Lorena watched him set up the tooling and thought: *he could do this in his sleep. That's not a problem. That's the shop.*

The GTSIO-520-L right magneto is accessed from the top of the engine, forward firewall area. N3382P is a high-wing aircraft, but the 421C has a nose gear configuration that means the engine cowlings come off from the right side panel on the ramp with ordinary hand tools. Raul had the cowl off and the intake baffles cleared in under twenty minutes.

**Removal:**
- Disconnect ignition harness from old magneto
- Remove magneto-to-engine mounting hardware (3 bolts, safety wire)
- Rotate crankshaft to TDC on compression stroke per Continental procedure
- Remove old magneto; record drive coupling orientation
- Document magneto S/N from the removed unit before bench disposal: SN OLD-6364-N3382P-R (per logbook)

**Installation of exchange unit:**
- Verify P/N and S/N of exchange unit against packing slip and 8130-3 (confirmed: P/N 06-164162-1, S/N WAS-EX-40417)
- Install magneto on engine drive coupling, align per Continental §74-00-00 timing procedure
- Initial advance timing set per Continental specification (22° BTC for right magneto on GTSIO-520-L)
- Safety wire mounting hardware
- Reconnect ignition harness
- Reinstall intake baffles and cowl

**Timing check (2026-08-26, 10:40 local):**
After installation, Raul connected the timing light and Lorena ran the timing check procedure. First measurement: 21.5° BTC — within tolerance (22° ± 1°). Lorena documented the measurement. Satisfied. Cowl reinstalled and torqued.

### §3.2 Ground Run and Magneto Check

**2026-08-26, 13:15 KPUB local**

Ground run performed by Lorena Vásquez on the KPUB ramp. KPUB weather: calm, 78°F, pressure altitude 4,692 ft MSL (KPUB field elevation 4,726 ft — high density altitude day, normal for August Pueblo).

Run-up checklist performed per POH:
- Left mag check: 75 RPM drop (within 150 RPM limit) ✅
- Right mag check: 80 RPM drop (within 150 RPM limit) ✅
- Both mags: smooth at 1,800 RPM ✅
- No roughness, no misfires

Raul noted the drops. *"That's cleaner than the old unit was running on a good day,"* he said. Lorena agreed. She taxied back to the hangar.

### §3.3 Work Notes Entered in Athelon

After the ground run, Lorena opened WO-HPAC-001 on the shop iPad. She navigated to the Work Progress tab and entered:

> *2026-08-26: Removed right magneto (S/N OLD-6364-N3382P-R at retirement, 289.9 SMSI). Installed exchange unit Slick P/N 06-164162-1 S/N WAS-EX-40417, 0 SMOH, per 8130-3. Timing set per Continental GTSIO-520-L OM §74-00-00. Timing confirmed 22° ± 1° BTC. Ignition harness reconnected. Ground run performed; both mag checks within limits (75R left, 80R right). Aircraft ready for pre-close review. Approved data: Continental GTSIO-520-L OM §74-00-00; Slick Magneto S&O Manual P/N 06-10977. — R. Montoya, A&P (performing); L. Vásquez, IA (supervising)*

She saved the entry. The WO status showed **IN PROGRESS**. One more step before CLOSED: the pre-close checklist.

---

## §4. Pre-Close Checklist and IA Sign-Off (2026-08-27)

### §4.1 The Pre-Close Checklist

Lorena had been anticipating this moment since the first time Marcus walked her through the work order lifecycle during the pre-onboarding gap brief. The pre-close checklist in Athelon (F-1.1-H, WS15-I, WS16-H) is what distinguishes a compliance platform from a log. You don't move to CLOSED by pressing a button. You move to CLOSED by confirming, item by item, that the record is complete.

She opened the pre-close checklist on the iPad at 09:15 on 2026-08-27.

**Pre-Close Checklist — WO-HPAC-001:**

| Item | Status | Notes |
|---|---|---|
| All work steps documented? | ✅ PASS | Work entry logged 2026-08-26 by R. Montoya / L. Vásquez |
| Parts used — P/N, S/N, 8130-3 filed? | ✅ PASS | Slick 06-164162-1 / WAS-EX-40417; 8130-3 uploaded 2026-08-25 |
| Approved data references logged? | ✅ PASS | Continental §74-00-00; Slick S&O Manual 06-10977; FAA AC 43.13-1B Ch.11 |
| Outstanding discrepancies? | ✅ PASS — NONE | No discrepancies found or open |
| Required inspections completed? | ✅ PASS | Ground run; magneto check performed and documented |
| IA sign-off authority verified? | ✅ PASS | Lorena Vásquez IA-CO-7745, current; expires 2027-09-30 |
| ALS item update queued? | ✅ PASS | ALS item WO-HPAC-001-MAG-R flagged for counter reset |

All seven items cleared. Lorena looked at the screen. The pre-close checklist was clean.

Raul had walked into the office at some point during the review. Derek Sousa — HPAC's co-owner and accountable manager — was standing in the doorway to the hangar. He wasn't doing anything in particular. He just happened to be there.

Lorena pressed **SUBMIT FOR IA SIGN-OFF.**

### §4.2 IA Sign-Off

The IA sign-off screen appeared. It presented:
- Work order summary (WO-HPAC-001, N3382P, right magneto service)
- Performing technician(s): Raul Montoya, A&P
- Supervision / IA oversight: Lorena Vásquez, IA-CO-7745
- Approved data referenced: YES
- Parts documentation: COMPLETE
- Ground test: COMPLETED
- Certification statement: *"I certify that the work identified in this work order has been completed in accordance with the applicable airworthiness requirements and data, and is approved for return to service."*

Lorena read it. She'd signed hundreds of maintenance releases in her career. On logbook paper, on FAA Form 337, on the pink carbon copies that used to live in the back of every shop. She'd never signed one on a screen connected to a platform that immediately updated the ALS board, filed the parts record, and notified the aircraft owner.

She typed her IA certificate number: **IA-CO-7745**.

She pressed **SIGN AND CLOSE.**

### §4.3 WO Closure and ALS Board Update

The system confirmed:

```
WO-HPAC-001 — CLOSED
Closed by: Lorena Vásquez (IA-CO-7745)
Timestamp: 2026-08-27T15:44:32Z
Aircraft: N3382P
Work scope: Right magneto service (Slick 06-164162-1, 0 SMOH)
ALS item MAG-R: reset. New counter: 0.0 hr SMSI
ALS status: COMPLIANT
Next service due: 3,501.3 + 500 = 4,001.3 hr TT
```

The ALS card for the right magneto on N3382P flipped from amber (DUE_SOON) to green (COMPLIANT). The work order card went dark — the visual language Athelon uses for closed items, a subtle gray on the WO board that means *done, documented, not needing attention.*

Raul Montoya looked over her shoulder at the screen. He didn't say anything. He went back to the hangar.

Derek Sousa was still in the doorway. He walked over, looked at the screen. The ALS board for N3382P showed all-green. The WO stack showed one closed item.

He said: *"So you don't have to write it in the logbook anymore?"*

Lorena looked at him. *"It's in the logbook too. This is in addition."*

Derek nodded. He went back to his desk. He had the charter schedule for September open on his monitor. He could see N3382P listed for the Tuesday 2026-09-01 booking — and for the first time, next to the tail number, the Athelon status badge that showed in the charter coordinator view read: **ALL COMPLIANT.** Not a checkbox he'd filled in. Not a note he'd made himself. Just the status, current, live, because Lorena had closed the work order.

He made a note to ask Nadia about adding the other two piston aircraft to the charter coordinator view.

---

## §5. Return to Service

**2026-08-27, 15:45 KPUB local**

Lorena Vásquez signed the return-to-service entry in the N3382P paper logbook:

> *"Removed and replaced right magneto per Slick Magneto Service and Overhaul Manual P/N 06-10977 and Continental GTSIO-520-L Overhaul Manual §74-00-00. Installed Slick 6364, P/N 06-164162-1, S/N WAS-EX-40417, 0 SMOH, per 8130-3. Timing set and confirmed 22°±1° BTC. Ground run and magneto checks within limits. Aircraft returned to service.*
>
> *Lorena Vásquez, IA-CO-7745 — HPAC Part 145 Repair Station — 2026-08-27"*

Then she took a photo of the logbook page with the shop iPad and attached it to WO-HPAC-001. The logbook and the platform agreed.

**N3382P status:** RETURNED TO SERVICE, 2026-08-27.
**Charter booking 2026-09-01:** Confirmed, aircraft available.

---

## §6. Nadia Solis Notification

Nadia had been on standby since the WO close window opened (week of 2026-08-25). She'd sent Lorena one message Monday morning: *"I'm here if anything comes up. Otherwise I'll see the close notification in the system."*

She saw the close notification at 15:44:32Z. She waited thirty minutes, then sent a message:

*"WO-HPAC-001 closed. ALS board looks good. N3382P is green. Let me know how the pre-close checklist felt — anything that slowed you down or felt unclear."*

Lorena replied about an hour later:

*"It felt fine. I had to look up where to attach the 8130-3 the first time — it's under Documents, not Parts, which I didn't expect. Other than that it was straightforward. The pre-close checklist is actually more useful than I expected. It made me slow down and verify things I would have assumed."*

Nadia logged the feedback. The 8130-3 attachment location was a UX note she passed to Chloe Park: *"User expects 8130-3 attachment to be on Parts tab, not Documents tab. Consider cross-linking."* Chloe acknowledged and added it to the Sprint 2 polish queue.

---

## §7. OI-33-03 Closure

**OI-33-03 — Formal Close**
**Closed:** 2026-08-27
**Resolution:** WO-HPAC-001 CLOSED. Right magneto serviced per approved data. Exchange unit installed (Slick 6364, P/N 06-164162-1, S/N WAS-EX-40417, 0 SMOH). ALS item MAG-R reset to 0.0 SMSI. N3382P returned to service 2026-08-27 by Lorena Vásquez IA-CO-7745.

**Status change:** ALS item N3382P / Right Magneto: DUE_SOON → COMPLIANT
**Next service due at:** 4,001.3 hr TT
**Estimated next advisory trigger:** ~2028 (500-hr interval; N3382P utilization ~80 hr/yr)

---

## §8. Significance: The First Close

Every shop on Athelon has had a first close. Bill Reardon at High Desert MRO closed WO-HD-001 on a PA-34-220T annual — the first live work order in any Athelon shop, filed and closed in a single eight-hour session while Nadia and Marcus watched on a video call. Sandra Okafor at Lone Star Rotorcraft signed the RTS on WO-LSR-CMR-001, the first ALS compliance loop Athelon ever ran, after Tobias Ferreira performed the rotor torque tube check on N76LS. Curtis Pallant closed WO-RDG-001 the same day Ridgeline Air Maintenance was onboarded, after Renard Osei corrected the fuel selector valve life count discrepancy in the logbook.

Each first close is small in scope. Each first close is proof of something large.

WO-HPAC-001 is Lorena Vásquez's first close. A 289.9-hour magneto service on a 1978 Cessna 421. Nothing about the work was extraordinary. The magneto came out, the exchange unit went in, the timing was checked, the aircraft ran. Lorena had done dozens of magneto services over her career. She'd done this particular work faster than the time it took to write it up.

What was different: the record. Not the paper logbook — though that exists too, duly signed, in the binder on the shelf above her desk. The platform record: the work order with the 8130-3 attached, the approved data reference logged, the pre-close checklist completed item by item, the ALS board updated, the RTS issued through the system. The record that Derek Sousa could see from across the building. The record that Nadia saw at 15:44Z. The record that would be there for the FSDO examiner if one ever walked in.

For Lorena Vásquez — who had managed a binder system for twenty-three years, who came inbound to Athelon with a note that said *not interested in another platform that doesn't understand what a CMR is* — the first close was the platform earning its place in the shop. Not at onboarding. Not at the King Air ALS activation. Here: a routine job, documented correctly, returned to service, done.

---

## §9. Compliance Receipt

**WO-HPAC-001:**
- **Type:** Scheduled maintenance (magneto service, TBO-coincident interval)
- **Aircraft:** N3382P (Cessna 421C, HPAC, KPUB, Part 145 + Part 135)
- **Work performed by:** Raul Montoya (A&P, HPAC)
- **IA sign-off:** Lorena Vásquez (IA-CO-7745)
- **Approved data:** Continental GTSIO-520-L OM §74-00-00; Slick Magneto S&O Manual P/N 06-10977
- **Parts:** Slick 6364 exchange unit, P/N 06-164162-1, S/N WAS-EX-40417, 0 SMOH, 8130-3 on file
- **Closed:** 2026-08-27T15:44:32Z
- **ALS item reset:** MAG-R → 0.0 hr SMSI
- **ALS board status:** COMPLIANT
- **RTS signed:** Lorena Vásquez, IA-CO-7745, 2026-08-27
- **N3382P return to service:** 2026-08-27
- **OI-33-03 status:** CLOSED

**Marcus Webb compliance clearance (reviewed 2026-08-28):**
> *"WO-HPAC-001 closure reviewed. Work order, parts documentation, approved data reference, pre-close checklist, IA sign-off, and RTS entry all complete per §145.211 and §145.217. ALS board update confirmed appropriate. No compliance flags. — M. Webb, Compliance Lead, 2026-08-28"*

**Compliance status:** ✅ COMPLIANT

---

*WS34-A complete. WO-HPAC-001 CLOSED. OI-33-03 CLOSED. N3382P returned to service 2026-08-27. High Plains Aero & Charter — 8th shop on Athelon — has completed its first work order close.*
