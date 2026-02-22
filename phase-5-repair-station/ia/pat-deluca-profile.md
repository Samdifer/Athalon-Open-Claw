# Patricia "Pat" Deluca — Inspection Authorization Holder
**Role:** Senior A&P / IA Holder — Return-to-Service Authority  
**Embedded with:** Athelon Engineering Team, Phase 5 Repair Station Integration  
**Date profiled:** 2026-02-22

---

## At a Glance

| | |
|---|---|
| **Certificate** | A&P — Airframe & Powerplant; Inspection Authorization (current, renewed annually) |
| **IA renewal date** | March 31 of each year (she notes this with the same tone other people use for tax deadlines) |
| **Years signing maintenance records** | 13 years as IA |
| **Total experience** | 28 years as A&P; IA authorized since 2013 |
| **Aircraft signed** | Primarily GA turboprop and light jet: King Air series, TBM 700/850, PC-12, Citation XLS, Learjet 35 |
| **Current employer** | Cascade Air Maintenance, Bend, OR (Part 145, 7-mechanic shop, turboprop-rated) |
| **Certificate number** | A&P #2887301; IA #IA-2887301-OR |
| **Preferred sign-off tool** | Used to be pen. Currently uses shop's EBIS 5 workstation with private skepticism. |

---

## Background

Pat grew up in eastern Oregon, went to A&P school in Portland, and spent her first six years doing everything at a single-runway FBO in Redmond — refueling, line service, maintenance, anything that needed doing. She has a quiet competence that other mechanics read immediately and respond to. When a problem is hard, people in her shop tend to look for Pat.

She pursued her IA in 2013 not because she wanted administrative authority but because the previous IA at Cascade retired and the DOM asked her directly. She has described her relationship with the IA this way: "It's not a title. It's a liability. Every single record I sign, I own forever. That doesn't go away when I leave this job, when I retire, or when the shop closes. That signature is permanent and so is my responsibility for what it says."

She has meant this literally on at least two occasions.

In 2017, an FAA Aviation Safety Inspector conducted a ramp check on a King Air 200 that Pat had signed out of annual the previous month. The inspector found a condition in the logbook entry that he wanted to discuss — specifically, the description of a landing gear component inspection that he believed was insufficiently detailed. He called the shop and gave Pat fifteen minutes to produce the complete work order record, including the task card with step-level sign-off and the reference documentation used for the inspection.

The work order existed in EBIS 5. The task card existed in EBIS 5. The problem was that EBIS 5, in their shop configuration, archived completed work orders to a backup state that took nine to twelve minutes to restore. Pat had three minutes to answer the inspector before he concluded the record was unavailable.

She called the shop's EBIS 5 vendor from the parking lot while the backup was restoring. She told the inspector that the record existed and was being restored from archive. The inspector gave her fifteen minutes. The record came up at thirteen minutes. It was complete and defensible. The inspection resolved without finding.

Pat has not forgotten the shape of those thirteen minutes.

---

## What a Signed Maintenance Record Means, In Her Words

"When I sign an RTS — Return to Service — I'm certifying under 14 CFR 43.9 and 43.11 that the work was done correctly, that it was done in accordance with the applicable maintenance data, that it was done by a certificated person, and that the aircraft is airworthy in its current configuration. That is a statement of fact I'm making to the FAA and to the owner and to every person who gets on that aircraft. It means I was there, I know what was done, and I'm putting my certificate number on the record. If any of that is wrong — if the task wasn't done the way the record says, if the reference was wrong, if somebody else signed off something they shouldn't have — I am the person the FAA calls. Not the mechanic who did the work. Me."

She is not dramatic about this. She states it flatly, the way you state something you've repeated many times because it keeps being relevant.

---

## Digital Signatures — Her Position

Pat is not opposed to digital signatures. She is opposed to digital signatures that are not legally defensible. There is a specific difference and she can articulate it.

Her requirement is this: the digital signature must be cryptographically tied to the record at the moment of signing, in a way that any subsequent alteration to the record is detectable. She does not need to understand how the cryptography works. She needs to be able to explain to an FAA inspector — in plain language, in fifteen minutes or less — why the digital signature on this record is legally equivalent to her ink signature, why the record cannot have been altered since she signed it, and where the evidence for both claims lives in the system.

She has read 14 CFR 43.9 and the relevant FAA Order (8900.1) about electronic records. She is not satisfied that most MRO software's implementation is actually defensible. She wants to see Athelon's specific answer to this before she will sign anything with it.

One additional requirement: she will not accept a signature method that depends on a PIN entry if the PIN is the only authentication factor. A 4-digit PIN is not an adequate signature for an FAA regulatory record, in her assessment. She wants either a multi-factor authentication (PIN + something) or a biometric where the biometric is properly enrolled. She is aware that biometrics fail in hangar environments. Her answer to that is: fail closed, not fail open. If Face ID doesn't work, the fallback is a stronger PIN — 6+ digits — plus a session authentication, not a weaker PIN.

---

## The March 31 Rule

She will bring up March 31 without prompting. An IA expires on March 31 every year unless renewed. She has set three independent calendar reminders for herself — one at 60 days, one at 30 days, one at 14 days — because she has seen another IA holder sign records after expiration without realizing it, and the consequences for the shop and the aircraft owner were significant.

Her requirement: the system should know her IA expiry date and should proactively warn her before it expires. It should also prevent her from signing inspection records once it has expired — not just warn, but block. And it should do the same for every other IA holder in the shop. This is not optional. This is the software doing its job.

---

## Personality & Interview Notes

Composed, precise, unhurried. She is not a fast talker. She is a complete talker — she finishes sentences entirely before moving to the next one. She has done the math on her career: she has signed approximately 2,400 maintenance records over 13 years and each one is somewhere, permanent, with her certificate number on it. She mentions this number not with pride but with a kind of weight.

She will push back on vague answers. If you tell her something "should be fine" or "should work," she will ask what "should" means specifically. She does not intend this as confrontational. She has learned that "should" in aviation software means "has not been tested in the situation you're about to be in."

---

## Known Requirements She Will Surface in Interview

- Digital signature must be explainable to an FAA inspector without software access (offline-legible evidence)
- Signature cryptographic linkage: record alteration after signing must be detectable
- IA expiry tracked and enforced in system — block inspection sign-offs after March 31
- 5-minute record retrieval: any closed work order must be retrievable within 5 minutes at any time
- RTS sign-off screen must show complete summary: what was done, on what aircraft, on what date, by whom, against what reference — before authentication
- Multi-factor or 6+ digit PIN authentication for IA-level signatures — not 4-digit PIN alone
- Audit log must be inspectable without software login (export to PDF that is self-evidencing)
