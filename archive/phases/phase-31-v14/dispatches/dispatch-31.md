# Dispatch No. 13 — The Loop
*by Miles Beaumont*

---

There's a moment in every project like this when the thing you've built either proves it can do what you said it could do, or it proves it can't. Usually the moment is smaller than you expect — not a dramatic demonstration in front of a crowd, but a quiet event in a hangar bay, involving people doing their jobs, a part coming off, a part going on.

I was at Rocky Mountain Turbine Service in Grand Junction on the morning of May 6th when Hector Ruiz removed a fuel selector valve from a Cessna 208B Grand Caravan registered N416AB.

Hector works the way experienced mechanics work when they're being careful: methodically, with few words and no wasted motion. He'd staged the tools the night before. The aircraft was on jacks, fuel drained to trace. He knew exactly what he was doing because Dale Renfrow had briefed him the week before, and Dale knew exactly what he was doing because an audit system had shown him the number that mattered: 11,857 cycles on a part with a 12,000-cycle life limit. One hundred and forty-three cycles of service life remaining.

The valve came off cleanly. Hector tagged it — "LIFE LIMIT RETIRED, 11,857 cycles, not to be returned to service" — set it in the retired-parts bin, and reached for the new one.

I asked him if this one felt different from other valve replacements he'd done. He thought about it for a moment. "Usually you replace something because it broke or an inspection found something," he said. "This one came off because a system told Dale it was getting close, and Dale ordered the part before it was a problem." He went back to work. He wasn't being philosophical. He was just describing what happened.

But what happened matters, so let me describe it in full.

---

## The Find

The story begins seven weeks earlier, on April 28th, in this same hangar, when Dale Renfrow sat down with the N416AB logbooks and a laptop running Athelon's ALS audit interface. The audit was the first turbine-type airworthiness limitations entry session the company had ever conducted — a new frontier for a system that had previously lived in the piston world.

Marcus Webb was on the other side of the table. Devraj Anand was entering data. The audit proceeded item by item through the Cessna 208B's 29 life-limited components — 18 airframe items, 11 engine LLPs and CMRs — and then reached item 17.

Fuel Selector Valve. P/N 9924721-1. Life limit: 12,000 cycles.

Dale read the logbook. "11,840." He checked his spreadsheet. His spreadsheet said 11,800. He paused. "My spreadsheet has 11,800. The logbook has 11,840. And we've flown it three times since the last logbook entry. So the real number is somewhere around 11,843."

Marcus said: "At 160 cycles remaining, this needs a work order today."

Dale said: "Yes."

He was right to have pre-flagged it in an email the week before. He was right to have the logbooks organized and ready. He was also right in a more uncomfortable way: his manual tracking had an error of approximately 40–47 cycles. Not a large error. Not an error born of negligence. Just the structural gap of a system where the number you write down and the number that's actually in the logbook can drift apart, and no alarm sounds when they do.

In Athelon, after that audit session, every subsequent logbook entry for N416AB updated the cycle counter automatically. The gap closed. There was no longer a spreadsheet number and a logbook number — there was one number, and it was the right one.

---

## The Track

Between April 28th and May 5th, Crimson Mesa Aviation flew N416AB fourteen more cycles. Dale tracked every one. The cycle counter in Athelon moved from 11,840 to 11,857 in real time — no spreadsheet update required, because Dale's work order entry after each flight fed the same data that ran the counter.

When Hector pulled the valve on May 5th, the number in the system matched the number on the part placard, matched the number in the logbook. Three sources, one answer. That's what clean records look like.

I want to be precise about what Athelon did during those fourteen cycles: it watched. It showed Dale the number. It showed him the trend. It was ready to surface an OVERDUE alert if the cycles somehow climbed above 12,000. It never had to, because Dale moved the aircraft into the shop when the number was 11,843.

The audit found the item. The work order tracked it. The ALS board logged the retirement. When Dale signed the maintenance release — "Returned to service" — the board updated one final time. Item 17, N416AB fuel selector valve: counter reset to zero. Life limit 12,000 cycles remaining. Status: COMPLIANT.

From OVERDUE_APPROACHING to COMPLIANT. One replacement. Complete digital chain.

That's the loop.

---

## The DOM's Chair

Five hundred miles southeast of Grand Junction, on the morning of June 10th, Sandra Okafor signed three return-to-service statements in the same afternoon.

The work took three days. Tobias Ferreira pulled the main rotor head off the S-76C registered N76LS, retired the main rotor hub yoke — 3,847 hours accumulated against a 4,000-hour life limit — installed a new one, pulled the tail rotor hub, retired that, installed a new one, removed all four main rotor dampeners, retired them, installed a new set, reran the rotor head, did a track and balance, ran the engine, checked everything, and handed Sandra the paperwork.

She signed it. Three work orders. Three ALS items reset to zero. Six life-limited components retired in one maintenance window instead of three.

I wasn't there for the June event — I was in Grand Junction through the end of May for the WO-RMTS-003 work. I talked to Sandra the evening of June 10th, after the ground run. She was tired in the way that competent people get tired after managing a significant job: relieved, a little flattened, already thinking about the next thing.

I asked her what it felt like to close three life-limited items in one afternoon.

She said: "It feels like I can see the whole board for the first time. Before we put the data in — before the Phase 26 data entry sessions, before the compliance loop, all of it — I had thirty-three life-limited items on that helicopter in my head. Some of them I remembered clearly. Some of them I thought I remembered. Some of them I know I was vague on. Now I look at a screen and all thirty-three are there, with numbers, with status colors. Three of them were amber. Now they're green. I don't have to carry that anymore. The system carries it. When those numbers start coming up again, I'll see them coming."

She paused. "The hard work was the data entry. Four hours with Tobias and the logbooks, in February. That was the investment. Everything since then has been the return."

---

## The Ridgeline Aside

Two weeks before the N76LS event, I was on a call with Curtis Pallant, the founding DOM of Ridgeline Air Maintenance in Reno. Curtis has been doing this work for twenty years — twelve years at a large Part 145 operation before he left to run his own shop because, as he put it, he wanted to know the name of every aircraft he touched.

During Ridgeline's ALS data entry session, the system found that Curtis's maintenance card for the N88KV Cessna 208B showed 10,800 cycles on the fuel selector valve — the same P/N 9924721-1 as N416AB's. The logbook said 11,114. The card was 314 cycles behind.

At 886 cycles remaining to the life limit, this isn't an urgent situation. It's a planning item. But Curtis had thought he had more than 1,000 cycles remaining. He had 886. The difference was a maintenance cycle's worth of tracking that had accumulated in the gap between the card he updated and the logbook that kept going.

Curtis's observation: "My card system works because I built it myself and I know every entry. But 'works because I know every entry' is not the same as 'works.' It works as long as I'm paying attention. The system doesn't need me to pay attention. It needs me to log the flight. That's a different kind of reliability."

He's right. And he's a man who has been paying attention for twenty years. Even he found a 314-cycle gap.

---

## What the Loop Means

Athelon has been in use at real shops for about a year now. In that time, it has opened work orders, tracked inspections, managed AD compliance, and documented return-to-service events. It has been useful. That usefulness had been primarily organizational: records in one place, approvals tracked, the paper-to-digital shift that every shop in the industry is navigating.

WO-RMTS-003 is different. WO-RMTS-003 is the first case where the system found something, tracked it, triggered procurement, documented the work, and updated the compliance record — all in one traceable chain. Not assisted by the system. Driven by it.

Dale didn't decide to audit the fuel selector valve cycle count on April 28th because he was worried about it. He audited it because the audit covered all 29 ALS items, including item 17. The system didn't let him skip it. When the number came up at 11,840, the board turned red. When it turned red, there was a work order. When there was a work order, there was a part ordered that afternoon. When the part arrived, Hector did the job. When the job was done, the board turned green.

The system didn't do the work. Hector did the work. Dale managed the shop. Marcus reviewed the documentation. The system held the record — accurate, current, and complete — from the moment the audit started to the moment the counter reset to zero.

That is the thing that matters. Not the software. Not the interface. The record. The fact that when N416AB's next owner, or next inspector, or next operator opens the maintenance history, they will see exactly what happened, in exactly what order, with exactly what part numbers and serial numbers and signatures. The story of a valve that was found at 160 cycles remaining, tracked to retirement at 143, and replaced before it became anything other than a routine maintenance event.

Most maintenance stories don't get told. This one is in the records.

That's the whole point.

---

*Miles Beaumont covers aviation technology and maintenance operations. Dispatch No. 13 was filed from Grand Junction, Colorado, with a follow-up call from Fort Worth, Texas.*
