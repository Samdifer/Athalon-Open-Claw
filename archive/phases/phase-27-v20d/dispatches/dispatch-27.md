# Dispatch No. 9 — The Shop
**By Miles Beaumont**
**Filed:** Phase 27, February 2026
**Series:** The Athelon Dispatches

---

Lone Star Rotorcraft is on the south side of Fort Worth, off Crowley Road, in a steel-frame hangar that was built for something else before it was a helicopter shop. The doors face north. On a cold morning — and February in Fort Worth can be cold, not brutal but genuinely cold — the wind comes through when the doors are open and the mechanics work in layers. There are four helicopters. There are three Bell 206B-III JetRangers and one Sikorsky S-76C. The JetRangers are in various states of maintenance. The S-76C is grounded on a drive belt.

The drive belt is N224LS.

I want to tell you about the drive belt before I tell you about anything else, because the drive belt is the reason I'm writing this dispatch about what a helicopter shop is and what the Bell 206 asks of the people who work there.

---

## N224LS

N224LS is not actually one of Lone Star's three Bell 206B-III JetRangers. It's a fourth — a customer aircraft. It came in for an annual. The squawks were minor. The review of the Bell 206B-III ALS items was not.

When Tobias Ferreira — Lone Star's lead A&P/IA, twelve years of helicopter work, Bell 206B-III experience going back to before he held his IA — sat down with N224LS's records, the ALS compliance picture was not clean. The main gearbox had been overhauled at 1,200 hours, which is correct. The freewheeling unit had been overhauled at the same interval, also correct. The main rotor hub was within its 5,000-hour retirement life. The Rolls-Royce 250-C20J engine TBO record was current.

Then he got to the Bell mandatory service instructions.

The Bell 206B-III has a category of mandatory maintenance that doesn't show up in the FAA AD database. They're issued by Bell Helicopter Textron through their Customer Support organization. Some of them are designated mandatory in the ICA — which means they carry the same compliance force as an ALS item. They're not ADs. They don't have AD numbers. You find them by reading Bell's service instruction index and comparing it against your aircraft's serial number range.

Tobias found a Bell mandatory SI in N224LS's open items. It was a grip bolt inspection and replacement SI. The main rotor hub grip bolts are the primary retention hardware for the rotor blades. Bell had issued the SI because of fatigue crack propagation findings in the bolt S/N range that N224LS fell into. The SI required inspection and replacement of bolts outside the wear criteria.

N224LS's records showed no compliance event for that SI. The prior shop had no `siItems` equivalent. The SI existed in Bell's documentation; it did not exist in the customer's maintenance tracking. N224LS had been flying with an open mandatory SI on primary flight-critical retention hardware.

Tobias grounded the aircraft. He called the owner. He wrote up the discrepancy. He scheduled the grip bolt inspection for the following morning.

That is the drive belt. Not a rubber component. A human one.

---

## Sandra Okafor

Sandra Okafor has been the DOM at Lone Star Rotorcraft for seven years. Before that she worked at a Part 135 charter operation in San Antonio, doing paperwork and compliance for a turbine fleet she was not yet certificated to maintain herself. She got her A&P while holding the DOM position at a smaller shop, which is not a common sequence. She is meticulous in the way that people are meticulous when they've had to be, when the paper was the only thing between the shop and a violation, when nobody was going to catch the detail she missed because she was the only person checking.

She keeps the Bell mandatory SIs in a three-ring binder. She keeps a tab for each aircraft. The binder is organized by aircraft registration, then by SI number within each tab. The summaries are printed from Bell's portal and annotated in her hand — compliance date, work order number, technician initials. The binder is current because Sandra keeps it current. It's accurate because she makes it accurate.

The binder is also not integrated with the work order system, does not generate alerts, does not produce a compliance state that a mechanic can consult before signing off a task, and provides no mechanism for ensuring that the mechanic who did the work yesterday and the one who shows up tomorrow both have the same picture of what's open. It depends entirely on Sandra being present, or on whoever touches the aircraft having the sense to walk over and ask her.

The problem with the binder is not that Sandra is inadequate. The problem is that the binder is only as good as Sandra's awareness and availability. Every DOM-maintained paper system is only as good as its DOM. When it works, it works because the DOM is competent. When it fails, it fails because the DOM is human: because they were on vacation, or on a call, or managing three other things when the aircraft went out the door.

The `siItems` table is designed to move the mandatory SI compliance state from Sandra's awareness into the aircraft's record. The compliance state lives in the data. The alert fires from the data. The mechanic who doesn't know to ask Sandra still encounters the NONCOMPLIANT flag on N411LS's mandatory SI board before he can sign off the task. Sandra's knowledge doesn't disappear — it becomes the seed data that populates the system, and the system remembers it when she's not in the room.

Sandra's assessment when she first saw this, on the demo call, was: "That's what the binder should have been from the beginning."

I thought that was worth writing down.

---

## What the Bell 206 Asks of You

The Bell 206B-III is an old design by the standards of contemporary helicopter engineering. The first production 206 flew in 1966. The Lone Star aircraft — N411LS, N412LS, N413LS — are 206B-IIIs, which means they're the third major production variant of a helicopter that has been in continuous production in various forms for sixty years. There are Bell 206s flying in every corner of the world where helicopters fly. The JetRanger is the most numerically significant turbine helicopter in general aviation history.

Being an old design doesn't mean it's simple. It means it's known. There is a vast body of operational and maintenance experience for the Bell 206B-III, accumulated over six decades of production and service. Bell's mandatory SIs are part of that body of knowledge. They're issued when Bell's engineering analysis identifies a risk that wasn't visible at initial certification — when fatigue data accumulates, when field findings come back, when a repair station or an overhaul facility finds something in a grip bolt that leads to a mandatory inspection. The SIs are Bell saying: we found something. You need to look.

The Bell 206 asks its maintainers to know these things. It asks them to read Bell's documentation and cross-reference it against the specific aircraft in front of them — not against their memory of the last Bell they touched, which might be a different serial number range, but against the actual records for this machine. It asks them to hold both the ALS and the mandatory SIs in their awareness simultaneously, because neither is optional and they come from different sources.

Tobias has been doing this from memory and from physical documentation for twelve years. He is very good at it. He will also tell you that the grip bolt situation on N224LS was not something he expected to find. He had looked at N224LS's records before and seen them as generally complete. The mandatory SI was in Bell's system. It was not in the customer's records in a form that would have been visible without specifically going to check Bell's SI index against the aircraft's serial number.

"That's the gap," he said. "You have to know to check. You have to go find it. It doesn't announce itself."

It announces itself now.

---

## The Machine Next to the Bell

The S-76C is a different animal.

Where the Bell 206B-III is a light turbine helicopter — single-engine, two main rotor blades, the design language of utility and simplicity — the Sikorsky S-76C is a transport category helicopter. Twin engines. Four main rotor blades. Certified under Part 29, not Part 27. The FAA holds the type certificate to a higher standard because the S-76C is used for operations where the consequences of a mechanical failure are commensurately larger.

N76LS has been on Lone Star's aircraft registry in Athelon since the first day of onboarding — which is to say, since Phase 25, when Sandra sat down with Nadia Solis and Marcus Webb and walked through the fleet. N76LS was entered correctly. Its compliance surface features were disabled correctly, pending an audit that hadn't happened yet. You cannot run Part 27 compliance logic on a Part 29 helicopter and expect to get correct answers.

The S-76C has a 33-item ALS set against the Bell 206B-III's 23 items. It has dual-authority engine compliance — the Turbomeca Arriel 2S1 engines are governed by Turbomeca's own ICA alongside Sikorsky's, and both are mandatory — in a way that is formally codified in the Part 29 ICA rather than informally noted as it was in Part 27. It has Certification Maintenance Requirements: scheduled tests for flight-critical systems derived from the certification fault tree analysis and mandatory per the Maintenance Review Board Report. None of this is in the FAA AD database.

The audit that needed to happen before N76LS's compliance surface could be turned on happened in this phase. Marcus Webb is the only person at Athelon who has the regulatory depth to do a Part 29 ALS audit without a dedicated Part 29 SME — he spent three weeks with the S-76C ICA before filing his findings. The data model extension for Part 29 dual-compliance tracking adds five fields to `alsItems`, all optional, all backward-compatible with the Part 27 records for N411LS and the R44 at High Desert. The extension is minimal because the design is careful.

N76LS's compliance surface is now enabled. The data entry comes next — thirty-three ALS items, the Sikorsky mandatory SB records, two sets of Turbomeca Arriel engine life limits. It will take an afternoon. Sandra knows how to do it. The system is ready for her.

---

## The Other Shop

Desert Sky Turbine is in Scottsdale, Arizona. Frank Nguyen has been the DOM there for six years. He runs a turbine shop — Cessna Caravans, Pilatus PC-12s, a Beechcraft King Air B200. He is careful, organized, and frank in the way that his first name implies without it being a joke.

When Phase 26 closed, Frank had three records in Athelon flagged for re-inspection. He had told Marcus he didn't know why the prior DOM marked them not applicable, and he wasn't going to pretend he knew. The three records sat in Athelon's compliance database with their flags and their 30-day clock running.

Two of the three turned out to be not applicable with documentation to support it. Frank found the basis, wrote the memos, and cleared the flags. The documentation is DST-MEMO-006 and DST-MEMO-007. They are not interesting to read. They are interesting to have.

The third record — Record 22, a Pratt & Whitney Canada PT6A-series compressor inspection AD — was the one Frank had been worried about. He called P&WC tech support. He gave them his engine serial numbers. He got a written response.

Two of his six engines fell within the AD applicability range. He'd known that was the possible outcome. The prior DOM had marked the record NOT_APPLICABLE with no notes. The prior DOM was wrong. The AD applied. And when Frank pulled the overhaul records and traced the compliance history, he found that the 400-hour repetitive inspection interval was overdue. The engines had been through an overhaul that included the required fluorescent penetrant inspection at overhaul. The overhaul was in November 2022. The next inspection was due 400 hours after the overhaul. Current flight hours since overhaul: 847.

Frank grounded the aircraft. He opened a work order. He scheduled the inspection at a P&WC-authorized facility.

I want to say something about this, because it would have been easy — in the soft sense of easy, where the action is technically possible even if it's wrong — to find a way to make this situation look better than it was. To say the overhaul counted as compliance. To say the 400-hour interval was ambiguous. To say the prior DOM might have had information Frank didn't have. Any of these moves are moves that exist in the world. They are the moves that result in aircraft flying with open ADs on critical engine components until something happens.

Frank did not make any of those moves. He grounded the aircraft, opened the work order, and scheduled the inspection. He told Marcus. He told Athelon. He wrote it down.

That's what it looks like when a DOM does his job. Not exciting. Not elegant. Just correct.

---

## What the System Is

I've been embedded with Athelon for a while now. I've watched the product go from a whiteboard to a deployed system with four live shops and a compliance architecture that is starting to approach the complexity of real-world regulatory requirements. I've been watching specifically for the moment when the product shows you what it actually is — not what the deck says it is, but what it becomes when it encounters the thing it was built for.

N224LS is that moment for the mandatory SI work.

Frank Nguyen is that moment for the AD compliance work.

In both cases, the thing that mattered was not that the system detected the problem in an automated, zero-human-intervention way. The system didn't find the open SI on N224LS's grip bolts by itself. Tobias found it, because Tobias knows to look. The system didn't detect Frank's overdue repetitive inspection interval on its own — Frank grounded the aircraft because Frank called P&WC and did the math.

What the system did — what it will do, now that the `siItems` table exists and the Bell mandatory SIs can be entered and tracked with compliance state alerts — is make the looking easier to do systematically. It makes it so that Tobias doesn't have to keep the full Bell SI index in his head alongside everything else. It makes it so that the alert fires when the compliance window closes, regardless of whether Tobias or Sandra or the next IA to touch the aircraft happens to know to check.

It extends human competence rather than replacing it.

Marcus Webb, who has reviewed the regulatory basis for every compliance architecture decision in the product, put it a way I want to repeat because I think it's the most accurate thing anyone has said to me about what this software is: "Compliance isn't something the software achieves. The IA achieves it, every time they sign their name. The software's job is to make sure they're not achieving it against incomplete information."

Tobias would agree. He signs his name carefully. He's been doing it for twelve years. He just wants the information to be there when he looks.

---

## N224LS

The grip bolts on N224LS were inspected the morning after Tobias grounded the aircraft. All bolts were within the wear criteria in the SI. None required replacement. Tobias wrote it up: inspected per Bell mandatory SI, bolts within limits, lockwired per Bell drawing, work complete. He signed it. The owner signed off on the return to service.

N224LS flew out on a Friday morning.

Tobias watched it go. He didn't say anything. He walked back inside and opened the next work order.

That is the helicopter shop. That is the Bell 206 and the person who keeps it airworthy. The grip bolts were fine. This time.

---

*Miles Beaumont is an aviation journalist and contributing correspondent for the Athelon Dispatches.*

*Dispatch No. 9 filed: Phase 27, February 2026.*
*Previous: Dispatch No. 8 — "The Database Returns Nothing. That's the Wrong Answer."*
