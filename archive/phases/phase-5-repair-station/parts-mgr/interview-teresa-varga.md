# Interview: Teresa Varga — Parts & Inventory Manager
**Interviewer:** Nadia Solis (Product Manager, Athelon)  
**Observer:** Finn Calloway (UX Designer, Athelon) — observing for workflow friction and UX pain points  
**Location:** Piedmont Air Services, Hickory NC — parts room / receiving area  
**Date:** 2026-02-22  
**Duration:** 68 minutes  
**Session type:** Discovery interview — repair station operations staff, Phase 5

---

*[Teresa is behind her receiving counter when Nadia and Finn arrive. There are two clipboards on the wall, both with handwritten logs. A shelf-life binder sits open on the desk next to a laptop running what appears to be an Excel spreadsheet and a separate window that Finn later notes is Corridor's inventory module — open to a parts list that does not appear to be sorted by anything useful.]*

---

**Nadia:** Teresa, thank you for making time. Before we get into the software piece, can you just walk me through a typical day? What does the morning look like for you?

**Teresa:** I get in about 7:15. First thing, I check the UPS and FedEx manifests from overnight — I print them before the drivers show up so I know what's supposed to be coming in. Then I open the work orders list in Corridor to see what parts got requested while I was out. Cross-reference those against what I have on the shelf. By the time the first delivery truck arrives at 8 or so, I already know what I'm waiting for and what I'm not.

Receiving takes most of the morning if we have orders in. Every part that comes through that door gets inspected before it goes on the shelf. That's not optional. That's not "when I have time." That's every part, every time.

**Nadia:** What does receiving inspection actually look like, step by step?

**Teresa:** The box comes in. I check the packing slip against the purchase order — part number, quantity, condition. Then I open the box and look at the actual part. I check the physical condition, the packaging — you'd be surprised how many people think a banged-up box with a dented component is acceptable because the *paperwork* looks clean. Then I look at the documentation.

The documentation is where you separate the shops that know what they're doing from the ones that don't. I need to see an 8130-3, a Certificate of Conformance, or documentation of an appropriate receiving inspection. For a new part from an approved distributor, usually it's a CoC and that's sufficient. For a repaired or overhauled part, I need the 8130-3. I check every field on that tag. Blocks 1 through 17. Every time.

**Nadia:** What are you looking for specifically on the 8130-3?

**Teresa:** Block 12, first thing. Is it life-limited? If yes, what's the remaining life stated? Does that match what the vendor represented when we ordered it? I've had distributors advertise a part as "5,000 cycles remaining" and the tag says 800. That's a conversation. 

Then Block 17 — the approval number. That's the releasing repair station's FAA certificate number. I look it up. Every single time. Is it a real cert? Is it still active? That's exactly how I caught the actuator in '21. The approval number in Block 17 belonged to a shop that hadn't been active in three years. The tag was a forgery.

**Nadia:** What happened when you found that?

**Teresa:** I pulled it immediately. Put it in the quarantine area — I have a separate cage, physically segregated, padlocked. I documented everything: the tag, the packing slip, the vendor's invoice. Wrote up an internal discrepancy report and called our DOM. We filed a SUP report with the FAA within 24 hours per FAA Order 8120.11. The part never touched a work order.

**Finn:** *[Note to self: padlocked physical quarantine area. Software has zero representation of this.]* Can I ask — how is that part represented in your software system right now, after you quarantine it?

**Teresa:** It's not, really. In Corridor I can set a status field, but there's nothing that *prevents* someone from issuing a quarantined part against a work order. The system doesn't enforce the segregation. My quarantine is enforced by a padlock and a Sharpie. The Sharpie says "SUSPECT — DO NOT ISSUE." *(pause)* That should not be how this works in 2026.

**Nadia:** So the enforcement is entirely physical and procedural, not technical?

**Teresa:** Correct. And the problem with that is people. People get rushed. A work order goes AOG, someone's pulling parts fast, they grab the wrong thing. I've walked out to the shop floor and stopped a mechanic from installing a part that was in my quarantine area because he pulled it when I wasn't watching. He didn't know. He wasn't being malicious. He just didn't see the Sharpie.

I wish the software would make it *structurally impossible* to issue a quarantined part. Not a popup that you click through. Impossible. The mutation fails. The part doesn't appear in the available inventory. It shouldn't even show up in a parts search as something you can select.

**Nadia:** What would quarantine release look like? Who clears it?

**Teresa:** DOM or me. Documented. A finding has to be attached — either "investigated, cleared, returned to serviceable inventory" with a reason and a signature, or "confirmed unserviceable — scrapped" with a destruction record. There's no version of coming out of quarantine without a paper trail.

**Nadia:** Let's talk about life-limited parts. You mentioned Block 12. Walk me through how you track life accumulation today.

**Teresa:** *(gestures at laptop)* I have a workbook. Every LLP we have in inventory or currently installed gets a row. Part number, serial number, life limit from the type certificate, hours accumulated from the last 8130-3, hours accumulated since we received it, hours remaining. I update it manually every time a part moves — received, installed, removed.

The problem is that Corridor doesn't help me with any of this. When a mechanic installs an LLP through a work order in Corridor, the system doesn't know how many hours that part has already accumulated in its life. It knows the hours at the time of installation, but it doesn't have the prior history unless I manually entered it when I received the part — and there's no validation that what I entered was correct.

So if I make a mistake in my spreadsheet, or if I'm out sick and someone else receives an LLP and doesn't know to update the workbook, the system just... doesn't care. It'll let the part accumulate hours from zero.

**Nadia:** What's the consequence if that goes wrong?

**Teresa:** *(stops)* An LLP installed past its service life is a mandatory scrap. It's not a maintenance item — it can't be inspected back to serviceable. If it fails, it fails catastrophically. Landing gear components, turbine disks, propeller hubs. If the system lets someone install a part that shows 200 hours remaining when it's actually got 50, and then it sits on an airplane for another 200 hours... *(doesn't finish the sentence)*

That's not a software bug. That's a safety failure.

**Nadia:** What would you need from a software system to replace your spreadsheet?

**Teresa:** I need the part's full life history from its 8130-3 forward. When I receive an LLP, I enter the life limit and the hours remaining from the tag. The system should compute hours already consumed — that's `life limit minus remaining`. Every time it gets installed and removed, it should accumulate those hours automatically from the work order's aircraft time. I want to see one number: total hours consumed across the entire part's life. Not just this work order. The total.

And I want alerts. I want to know when any LLP in my inventory or installed on an aircraft is within 10 percent of its life limit. I don't want to find out when someone tries to install it.

**Nadia:** What about shelf-life parts?

**Teresa:** Same problem, different clock. Shelf life is calendar time, not flight hours. Rubber seals, O-rings, hoses, pyrotechnic devices — all have calendar expiry dates. Right now I have my shelf-life spreadsheet and I look at it every Monday. I have color coding — red is expired, yellow is within 30 days, orange is 90 days. I built this because Corridor has a shelf-life date field but doesn't flag it for anything.

I wish the software would just show me a dashboard every morning. Here are the things expiring this month. Here are the things that already expired that are still on my shelf. Because I will tell you right now, there are shops that have expired shelf-life parts sitting in inventory because nobody built a spreadsheet like I did. And eventually one of those seals ends up on an aircraft.

**Nadia:** Earlier you mentioned receiving inspection being bypassable. Can you give me a specific example?

**Teresa:** In Corridor, there's nothing that checks whether receiving inspection is complete before a part can be issued against a work order. It checks if the part is in inventory — if the location field says "inventory," it can be issued. But a part can get put into inventory *before* receiving inspection is logged. I've walked in on mornings where parts were already pulled for a work order and the documentation wasn't even in the system yet. The mechanic put the delivery box on my desk and issued the part against the job himself.

I wish the software would hold a part in a "received but not inspected" status that is completely separate from "available inventory." You receive it — it's in the system. It cannot be issued until I have completed receiving inspection and checked it off. That's not a technical problem. That's a decision the software designers made, and they made the wrong one.

**Finn:** *[Key requirement: distinct "received/pending inspection" location state — not the same as inventory.]*

**Nadia:** One last thing — when an FAA inspector comes in, what does the parts side of an audit look like?

**Teresa:** They want to see traceability for any installed part they pick. They'll pick a tail number, ask for a work order, pull a part off that job, and they want to see it all: 8130-3, receiving record, installation record, technician signature. If any link in that chain is missing, you have a problem.

Currently I can pull the paperwork chain manually. It takes time. I know where everything is because it's mostly in my head and my binder. When I leave this job, that institutional memory walks out the door with me.

Software should make that chain retrievable in 30 seconds. Not because I can't do it — because the chain should be enforced when the part moves, not reconstructed after the fact from paper.

*[Session ends. Teresa walks Finn through the physical quarantine cage and the shelf-life binder. Finn photographs the binder layout with Teresa's permission.]*

---

## Product Requirements Captured — Teresa Varga

| # | Requirement | Priority | Source Quote |
|---|---|---|---|
| PR-TV-01 | Quarantine must be a system-enforced location state; quarantined parts must not be issuable, searchable for selection, or visible as available inventory | Critical | *"Structurally impossible to issue a quarantined part"* |
| PR-TV-02 | Received parts must exist in a "pending receiving inspection" state that is not issuable until inspection is complete and documented | Critical | *"A receiving but not inspected status completely separate from available inventory"* |
| PR-TV-03 | LLP life accumulation must track total hours/cycles across the full part history (not per work order); derived from 8130-3 Block 12 at receive, then auto-accumulated on install/remove | Critical | *"Total hours consumed across the entire part's life"* |
| PR-TV-04 | Shelf-life expiry alerts must be surfaced proactively — dashboard or morning summary showing items expiring within 30/60/90 days and items already expired | High | *"Show me a dashboard every morning"* |
| PR-TV-05 | Suspect 8130-3 flagging must lock all linked parts to quarantine; the lock must be system-enforced, not advisory | Critical | *"Should be structurally impossible"* |
| PR-TV-06 | Quarantine release must require a documented finding and authorized signature (DOM or Parts Manager); release path must be distinct from normal inventory movement | High | *"No version of coming out of quarantine without a paper trail"* |
| PR-TV-07 | LLP alerts at configurable threshold (suggest: 10% of rated life remaining); alerts must reach Parts Manager proactively, not only at installation attempt | High | *"I want to know when any LLP is within 10 percent"* |
| PR-TV-08 | Parts traceability chain must be retrievable in the UI from any part record — full chain from 8130-3 through installation to current status — without manual assembly | High | *"Retrievable in 30 seconds"* |
| PR-TV-09 | Error message on blocked installation must be specific: state which documentation is missing, who can resolve it, and what the resolution path is | Medium | *"Not a warning you click through"* |

---

*Interview conducted by Nadia Solis. UX observations by Finn Calloway.*  
*Document prepared 2026-02-22.*
