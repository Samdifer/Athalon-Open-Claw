# Dispatch #21 — Two Shops
*by Miles Beaumont*

---

There's a thing that happens when you're in a room and someone realizes something for the first time. Not an idea — an idea is abstract. I mean a concrete realization. The moment the abstract becomes actual. You can see it happen. There's a physical thing the person does, a kind of stillness, and then whatever they say after that is not their prepared words. It's the first words they had.

I've been looking for those moments since I started following Athelon. The first one was Carla signing the RTS on the Skylane back in November. I wrote about it in the first dispatch. Today I want to write about a different one.

---

I was at High Desert Avionics & Maintenance in Prescott on March 4th. Bill Reardon's shop. Six people, two Senecas and a Baron, a row of Cherokees in the queue. Bill is twenty-two years in this business. He runs a tight operation. He's the kind of person who, when he agreed to try Athelon, said to me: "I'm not doing this because it's new. I'm doing it because Carla told me it was worth doing, and Carla has never been wrong about anything that matters."

Two days earlier — Day 1 of onboarding — Rosa Eaton had run the LLP baseline audit and found that Bill's engine mount life count on one of his Senecas was off by seventy-two hours. His spreadsheet said 4,340. The logbook said 4,412. The mounts had plenty of margin; nobody was grounded. But the number was wrong, and the wrong number had been in the spreadsheet since at least October, a propagation error from a backup file that was itself a copy of an earlier file. Three versions of the truth, and nobody knew which one was right because they all looked right.

Rosa entered 4,412. The system locked it. That was the baseline now.

Wednesday. I'm in the shop when Bill's lead mechanic Marco is working on a Cherokee 100-hour. Marco Estefan — twelve years in aviation, A&P/IA, the kind of mechanic who can smell a cylinder problem before he's opened the cowl. He needs to check the engine component history on the Cherokee. Without thinking about it, he starts to reach for the folder on the shelf. The one with the spreadsheet printouts.

He stops.

He looks at the iPad.

He opens Athelon instead.

He finds what he needs in about fifteen seconds — the history, the hours, the component entries from the Day 1 audit and the backfill from the logbooks. He stands there reading it for a moment.

Then he says: "Huh."

Bill looks up from the other side of the shop. "What?"

"I was going to get the folder."

A pause.

"Which version of the spreadsheet was I even using?"

Bill says: "The spring one."

Marco says: "The one with the error."

And then, after a moment: "There's only one version now."

---

I didn't write that down immediately. I waited until I was outside. I wanted to sit with it.

*There's only one version now.*

He wasn't talking to anyone in particular. He was saying it the way you say something when you need to hear it to believe it. The externalization of a thought that's just become real.

The thing about that phrase is what it doesn't say. It doesn't say *I no longer have to worry*. It doesn't say *the system solved this*. It says something simpler and more radical: there is one version. There is not a spring version and a November version and a backup. There is one version, and it is the same version in every room, on every device, for every person.

That sounds obvious. It sounds like a minimum bar — of course you want one version of the truth. Every software pitch in the world says "single source of truth." But go look at how many maintenance shops are actually running on that. Go count the spreadsheets. Count the printouts. Count the times a mechanic has to ask which file the DOM updated last. Count the times an IA has signed off on a component life count that was quietly wrong because the number traveled through three backup files before it got to the task card.

Seventy-two hours. That was the error at High Desert. Plenty of margin. Caught on Day 1 because Rosa runs the audit before anything else goes into the system, non-negotiable. But I keep thinking about what seventy-two hours looks like when the margin is smaller.

---

I've been embedded in two shops now. Carla's shop in Columbus — Skyline Aviation, a well-run Part 145 repair station, eleven people, the full range of aviation maintenance work. And now Bill's shop in Prescott. They've never met in person. They communicate through Carla's phone call in January and through Athelon.

What strikes me, being in both rooms, is how much they have in common and how different they are. Carla's shop has the rhythm of a place that has been doing this the same way for a long time and is now doing it a different way — still the same culture, same rigor, but the workflow is new. Bill's shop is starting the transition fresh, week one, and Bill is watching his team figure out what to reach for.

The product is identical in both shops. Same hash function on every record. Same audit trail structure. Same RTS enforcement logic — you cannot close a work order with an unsigned task card, period, no override, no exceptions. Same IA re-authentication prompt. Same LLP dashboard. Same PDF export format, which is what a self-contained maintenance record looks like when it's designed to outlast the software that produced it.

But Skyline's records are entirely Skyline's. High Desert's records are entirely High Desert's. They don't share data. They don't share history. The aircraft at Skyline have no relationship to the aircraft at High Desert. What they share is the architecture — the invisible structure that makes both shops' records readable, trustworthy, and auditable in the same way.

A record from Skyline and a record from High Desert, presented to an FAA inspector, would look the same. Not because they contain the same information, but because they follow the same structure. Signed by a certificated individual. Timestamped. Linked to the specific task reference. Hash-verified. The inspector doesn't have to wonder whether the signature is real or whether the record was modified after the fact.

That's what Carla meant when she called Bill. She wasn't selling him software. She was telling him: I know what my records look like now, and I know what they'll look like to an auditor. That's worth something. You should know too.

---

I want to be honest about where Athelon is right now. Two shops. Eleven and six certificated personnel. A combined fleet that fits in two hangar bays. By any measure of the aviation maintenance industry — 6,000 Part 145 repair stations in the United States, the majority running on paper or on spreadsheets or on legacy software that hasn't been updated since the aircraft it serves were new — two shops is a rounding error.

But two shops is also the moment the thing becomes real in a different way. One shop is a product. Two shops is a network. Not much of one yet — not enough to be visible from the outside — but the architecture is there. The same hash function in both rooms. The same audit trail. The same RTS enforcement. Whatever the third shop looks like, and the fourth, and the hundredth, they will plug into the same structure.

The question of what it would take to reach the 6,000 is not a technology question. The technology exists. What it takes is this: every shop, before it can join, has to do what Rosa makes non-negotiable. The baseline audit. The confrontation with the discrepancy — wherever it is, however small or large — between what the shop believed was true and what the primary sources actually say.

That's not a software feature. That's a process. And the process has to come before anything else, because you cannot build a trustworthy record on top of a foundation that hasn't been audited. You can't patch your way from a bad spreadsheet to a reliable system. You have to start with the ground truth.

Bill's seventy-two hours. Whatever the next shop's version of that is. The moment where the audit finds something small, or not so small, and the DOM has to decide whether to face it or look away.

Every shop that's still on paper has that moment waiting for it.

---

What will Bill's records look like in five years?

I think about this from the inspector's side. Walk into High Desert in 2031. Ask for the maintenance history on N3847R — the Seneca II. Pull up the aircraft record. Every work order since March 2026, complete, hash-verified, with the signed task cards linked to the specific regulatory authority for each task, the IA re-authentication for every RTS, the LLP history starting from the 4,412-hour corrected baseline Rosa established on Day 1. The PDF export is self-contained — it doesn't require Athelon to be running to read it. It doesn't require Bill's shop to still exist. It is what it is, forever, unmodifiable, signed by the people who did the work and reviewed by the DOM who was responsible for it.

Compare that to what it might look like without this. A paper logbook, an Excel file that's been through three versions, a pile of signed task cards in a manila folder. Maybe all there. Maybe some missing. Maybe some of the numbers off by seventy-two hours or more.

That's not a hypothetical. That's what most of the 6,000 shops have right now.

What's left to build is not a mystery. Photo attachments that make the record complete. Proactive notifications that make the compliance management active. OCR that reduces the manual error surface. Multi-shop record visibility for when an aircraft crosses from one shop to another. The thousand small things that make the daily friction lower and the daily confidence higher.

What's left to build is also something harder to specify: the trust that makes a shop operator like Bill agree to let Rosa run the audit before the system touches anything. The willingness to find the error. The discipline to build on the truth rather than on the version you hoped was true.

Marco said it best, without meaning to.

There's only one version now.

---

*Miles Beaumont covers aviation technology and maintenance culture. This is his third dispatch from the Athelon rollout.*
